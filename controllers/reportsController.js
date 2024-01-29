const Excel = require("exceljs");
const Project = require("../models/Project");
const Task = require("../models/Task");


async function generateReportData() {
  // Retrieve all projects
  const projects = await Project.find().populate({
    path: "phasesHistory",
    model: "ProjectPhaseDetail",
    populate: [
      {
        path: "phase",
        model: "Phase",
      },
      {
        path: "phaseLead",
        model: "User",
        select: "-password", // Exclude password field
      },
    ],
  });

  // console.log("Projects", projects);
  // projects.forEach((project) => {
  //   console.log(
  //     `Project ${project.projectName} has the following phase history:`
  //   );
  //   project.phasesHistory.forEach((phaseHistory) => {
  //     console.log(JSON.stringify(phaseHistory, null, 2)); // Pretty print the phase history
  //   });
  // });

  // Iterate over projects to construct the report data
  const reportData = await Promise.all(
    projects.map(async (project) => {
      // Retrieve tasks for the project
      const tasks = await Task.find({
        associatedProject: project._id,
      }).populate("associatedPhase");

      // console.log("Tasks", tasks);

      // Map to store phase data with tasks
      const phasesData = new Map();

      // Collect all remarks from completed tasks
      let allCompletedTaskRemarks = [];

      // Process tasks, group by phase, and collect completed task remarks
      tasks.forEach((task) => {
        const phase = task.associatedPhase;
        if (phase) {
          const phaseId = phase._id.toString();
          if (!phasesData.has(phaseId)) {
            phasesData.set(phaseId, {
              phaseName: phase.phaseName,
              phaseLead: "",
              tasks: [],
              phaseCompletionRate: 0,
            });
          }
          phasesData
            .get(phaseId)
            .tasks.push({ taskName: task.taskName, status: task.status });

          // Collect remarks from completed tasks
          if (task.status === "Done") {
            allCompletedTaskRemarks.push(
              ...task.remarks.map((remark) => ({
                text: remark.text,
                createdAt: remark.createdAt,
              }))
            );
          }
        }
      });

      // Sort remarks by createdAt date
      allCompletedTaskRemarks.sort((a, b) => a.createdAt - b.createdAt);

      // Populate phasesData with phase leads and completion rates
      project.phasesHistory.forEach((phaseDetail) => {
        const phaseId = phaseDetail.phase._id.toString();
        if (phasesData.has(phaseId)) {
          const phaseData = phasesData.get(phaseId);
          phaseData.phaseLead = phaseDetail.phaseLead
            .map((user) => user.name)
            .join(", ");
          phaseData.phaseCompletionRate = phaseDetail.phaseCompletionRate;
        }
      });

      // Convert phasesData to an array and filter out phases without tasks
      const phasesWithTasks = Array.from(phasesData.values()).filter(
        (phase) => phase.tasks.length > 0
      );

      // Construct the project report entry
      const projectReportEntry = {
        projectName: project.projectName,
        projectDescription: project.projectDescription,
        startDate: project.startDate,
        endDate: project.actualEndDate || project.estimatedEndDate,
        projectCompletionRate: project.projectCompletionRate,
        phases: phasesWithTasks,
        remarks: allCompletedTaskRemarks.map(
          (remark) =>
            `${remark.createdAt.toISOString().split("T")[0]} - ${remark.text}`
        ),
      };

      return projectReportEntry;
    })
  );

  return reportData;
}

async function createExcelReport(data) {
  let workbook = new Excel.Workbook();
  let worksheet = workbook.addWorksheet("Project Report");

  worksheet.columns = [
    { header: "Project Name", key: "projectName", width: 30 },
    { header: "Project Description", key: "projectDescription", width: 25 },
    { header: "Start Date", key: "startDate", width: 15 },
    { header: "End Date", key: "endDate", width: 15 },
    { header: "Completion Rate", key: "completionRate", width: 15 },
    // Define headers for all phases
    { header: "Planning Phase Lead", key: "planningPhaseLead", width: 20 },
    { header: "Planning Phase Tasks", key: "planningPhaseTasks", width: 30 },
    {
      header: "Planning Completion Rate",
      key: "planningPhaseCompletionRate",
      width: 20,
    },
    { header: "Analysis Phase Lead", key: "analysisPhaseLead", width: 20 },
    { header: "Analysis Phase Tasks", key: "analysisPhaseTasks", width: 30 },
    {
      header: "Analysis Completion Rate",
      key: "analysisPhaseCompletionRate",
      width: 20,
    },
    { header: "Design Phase Lead", key: "designPhaseLead", width: 20 },
    { header: "Design Phase Tasks", key: "designPhaseTasks", width: 30 },
    {
      header: "Design Completion Rate",
      key: "designPhaseCompletionRate",
      width: 20,
    },
    { header: "Code Phase Lead", key: "codePhaseLead", width: 20 },
    { header: "Code Phase Tasks", key: "codePhaseTasks", width: 30 },
    {
      header: "Code Completion Rate",
      key: "codePhaseCompletionRate",
      width: 20,
    },
    { header: "Test Phase Lead", key: "testPhaseLead", width: 20 },
    { header: "Test Phase Tasks", key: "testPhaseTasks", width: 30 },
    {
      header: "Test Completion Rate",
      key: "testPhaseCompletionRate",
      width: 20,
    },
    { header: "Remarks", key: "remarks", width: 50 },
  ];

  // Apply styles to headers
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0000FF" },
    };
    cell.alignment = { horizontal: "center" };
  });

  // Define background colors for each phase group
  const phaseColors = {
    planning: "FFF0F8FF", // Light blue
    analysis: "FFF5F5DC", // Beige
    design: "FFFAFAD2", // Light salmon
    code: "FFF0FFF0", // Honeydew
    test: "FFFFE4E1", // Misty rose
  };

  // Format completion rates as numbers
  [
    "completionRate",
    ...Object.keys(phaseColors).map((pc) => `${pc}PhaseCompletionRate`),
  ].forEach((key) => {
    worksheet.getColumn(key).numFmt = "0.00%";
  });

  data.forEach((project, index) => {
    // Create a row per project with merged cells for remarks
    let rowValues = {
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      startDate: project.startDate,
      endDate: project.endDate,
      completionRate: `${project.projectCompletionRate}%`,
      // Initialize all phase columns with null
      planningPhaseLead: null,
      planningPhaseTasks: null,
      planningPhaseCompletionRate: null,
      analysisPhaseLead: null,
      analysisPhaseTasks: null,
      analysisPhaseCompletionRate: null,
      designPhaseLead: null,
      designPhaseTasks: null,
      designPhaseCompletionRate: null,
      codePhaseLead: null,
      codePhaseTasks: null,
      codePhaseCompletionRate: null,
      testPhaseLead: null,
      testPhaseTasks: null,
      testPhaseCompletionRate: null,
      remarks:
        "• " +
        project.remarks
          .map((r) => r.replace(/^(\d{4}-\d{2}-\d{2}) - /, "$1 - "))
          .join("\n• "), // Join remarks with bullet points
    };

    // Fill in phase data if available
    project.phases.forEach((phase) => {
      let phaseKey = phase.phaseName.toLowerCase().replace(/[^a-z]/g, ""); // 'Planning' -> 'planning'
      if (rowValues.hasOwnProperty(`${phaseKey}PhaseLead`)) {
        // Check if the phase column is defined
        rowValues[`${phaseKey}PhaseLead`] = phase.phaseLead;
        rowValues[`${phaseKey}PhaseTasks`] =
          "• " +
          phase.tasks.map((t) => `${t.taskName} - ${t.status}`).join("\n• "); // Concatenate status with each task
        rowValues[
          `${phaseKey}PhaseCompletionRate`
        ] = `${phase.phaseCompletionRate}%`;
      }
    });

    const newRow = worksheet.addRow(rowValues);

    // Define a mapping of phase names to their associated column keys
    const phaseColumnMapping = {
      planning: [
        "planningPhaseLead",
        "planningPhaseTasks",
        "planningPhaseCompletionRate",
      ],
      analysis: [
        "analysisPhaseLead",
        "analysisPhaseTasks",
        "analysisPhaseCompletionRate",
      ],
      design: [
        "designPhaseLead",
        "designPhaseTasks",
        "designPhaseCompletionRate",
      ],
      code: ["codePhaseLead", "codePhaseTasks", "codePhaseCompletionRate"],
      test: ["testPhaseLead", "testPhaseTasks", "testPhaseCompletionRate"],
    };

    // Apply text wrapping and background color to all columns for each phase
    Object.keys(phaseColumnMapping).forEach((phaseKey) => {
      phaseColumnMapping[phaseKey].forEach((columnKey) => {
        if (worksheet.columns.find((col) => col.key === columnKey)) {
          if (columnKey.includes("Tasks")) {
            worksheet.getColumn(columnKey).alignment = { wrapText: true };
          }
          worksheet.getColumn(columnKey).eachCell((cell, rowNumber) => {
            if (rowNumber !== 1) {
              // Skip header row
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: phaseColors[phaseKey] },
              };
            }
          });
        }
      });
    });

    // Add an empty row with color fill after each project
    const emptyRow = worksheet.addRow([]);
    emptyRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      }; // Light grey
    });

    // Set the remarks column index based on the fixed number of columns before it
    const remarksColumnIndex =
      worksheet.columns.findIndex((col) => col.key === "remarks") + 1;
    worksheet.mergeCells(
      newRow.number,
      remarksColumnIndex,
      newRow.number,
      worksheet.columnCount
    );

    // Set wrap text for the remarks cell
    newRow.getCell(remarksColumnIndex).alignment = { wrapText: true };
  });

  // Apply borders, styles, etc. as per your requirements

  return await workbook.xlsx.writeBuffer();
}

const getOverallReport = async (req, res) => {
  try {
    const reportData = await generateReportData();
    // res.json(reportData);
    const excelBuffer = await createExcelReport(reportData);
    // Set the response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=project-report.xlsx"
    );
    res.setHeader("Content-Length", excelBuffer.length);

    // Send the Excel buffer to the client for download
    res.send(excelBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating report");
  }
};

module.exports = {
  getOverallReport,
};
