const User = require("../models/User");
const Excel = require("exceljs");
const path = require("path");
const Project = require("../models/Project");
const ProjectPhaseDetail = require("../models/PhaseDetail");
const Task = require("../models/Task");
const Phase = require("../models/Phase");

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

// async function createExcelReport(data) {
//   let workbook = new Excel.Workbook();
//   let worksheet = workbook.addWorksheet("Project Report");

//   // Define columns based on your report format
//   worksheet.columns = [
//     { header: "Project Name", key: "projectName", width: 30 },
//     { header: "Project Description", key: "projectDescription", width: 25 },
//     { header: "Start Date", key: "startDate", width: 15 },
//     { header: "End Date", key: "endDate", width: 15 },
//     { header: "Completion Rate", key: "completionRate", width: 18 },
//     { header: "Phase Name", key: "phaseName", width: 20 },
//     { header: "Phase Lead", key: "phaseLead", width: 20 },
//     { header: "Task Name", key: "taskName", width: 20 },
//     { header: "Task Status", key: "taskStatus", width: 15 },
//     { header: "Phase Completion Rate", key: "phaseCompletionRate", width: 20 },
//     { header: "Remarks", key: "remarks", width: 50 }, // Assuming remarks are a concatenated string
//   ];

//   // Add rows to the worksheet for each project and its details
//   data.forEach((project, projectIndex) => {
//     // Add project information only once at the start of each project's details
//     let projectInfoAdded = false;

//     project.phases.forEach((phase) => {
//       phase.tasks.forEach((task) => {
//         let row = {
//           projectName: projectInfoAdded ? null : project.projectName,
//           projectDescription: projectInfoAdded
//             ? null
//             : project.projectDescription,
//           startDate: projectInfoAdded ? null : project.startDate,
//           endDate: projectInfoAdded ? null : project.endDate,
//           completionRate: projectInfoAdded
//             ? null
//             : `${project.projectCompletionRate}%`,
//           phaseName: phase.phaseName,
//           phaseLead: phase.phaseLead,
//           taskName: task.taskName,
//           taskStatus: task.status,
//           phaseCompletionRate: `${phase.phaseCompletionRate}%`,
//         };

//         worksheet.addRow(row);
//         projectInfoAdded = true; // Set flag to true after first set of project details is added
//       });
//     });

//     // Add the project's remarks at the end of the project's tasks
//     if (project.remarks && project.remarks.length > 0) {
//       worksheet.addRow({
//         remarks: project.remarks.join("; "), // Join remarks with a semicolon and a space
//       });
//     }

//     // Add a blank row after each project for better readability
//     worksheet.addRow([]);
//   });

//   // Format the worksheet as needed
//   // Apply styles, filters, etc. as per your requirements

//   // Generate the Excel buffer
//   const excelBuffer = await workbook.xlsx.writeBuffer();
//   return excelBuffer;
// }

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
    { header: "Planning Task Status", key: "planningTaskStatus", width: 15 },
    {
      header: "Planning Completion Rate",
      key: "planningPhaseCompletionRate",
      width: 20,
    },
    { header: "Design Phase Lead", key: "designPhaseLead", width: 20 },
    { header: "Design Phase Tasks", key: "designPhaseTasks", width: 30 },
    { header: "Design Task Status", key: "designTaskStatus", width: 15 },
    {
      header: "Design Completion Rate",
      key: "designPhaseCompletionRate",
      width: 20,
    },
    { header: "Remarks", key: "remarks", width: 50 },
  ];

  // Function to get the fill color based on task status
  const getStatusFill = (status) => {
    const colors = {
      Done: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF00FF00" },
      },
      "To Do": {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF0000" },
      },
      // Add more statuses as needed
    };
    return (
      colors[status] || {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFFFF" },
      }
    ); // Default white
  };

  data.forEach((project) => {
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
      planningTaskStatus: null,
      planningPhaseCompletionRate: null,
      designPhaseLead: null,
      designPhaseTasks: null,
      designTaskStatus: null,
      designPhaseCompletionRate: null,
      remarks: project.remarks.join("\n• "), // Join remarks with bullet points
    };

    // Fill in phase data if available
    project.phases.forEach((phase) => {
      let phaseKey = phase.phaseName.toLowerCase().replace(/[^a-z]/g, ""); // 'Planning' -> 'planning'
      if (rowValues.hasOwnProperty(`${phaseKey}PhaseLead`)) {
        // Check if the phase column is defined
        rowValues[`${phaseKey}PhaseLead`] = phase.phaseLead;
        rowValues[`${phaseKey}PhaseTasks`] = phase.tasks
          .map((t) => t.taskName)
          .join("\n");
        rowValues[`${phaseKey}TaskStatus`] = phase.tasks
          .map((t) => t.status)
          .join("\n");
        rowValues[
          `${phaseKey}PhaseCompletionRate`
        ] = `${phase.phaseCompletionRate}%`;
      }
    });

    const newRow = worksheet.addRow(rowValues);

    // Apply color coding for task status
    project.phases.forEach((phase) => {
      const phaseKey = phase.phaseName.toLowerCase().replace(/[^a-z]/g, "");
      phase.tasks.forEach((task) => {
        const cell = newRow.getCell(`${phaseKey}TaskStatus`);
        cell.fill = getStatusFill(task.status);
      });
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
