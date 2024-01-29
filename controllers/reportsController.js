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
        select: '-password' // Exclude password field
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

  // Define columns based on your report format
  worksheet.columns = [
    { header: "Project Name", key: "projectName", width: 30 },
    { header: "Project Description", key: "projectDescription", width: 25 },
    { header: "Start Date", key: "startDate", width: 15 },
    { header: "End Date", key: "endDate", width: 15 },
    { header: "Completion Rate", key: "completionRate", width: 18 },
    { header: "Phase Name", key: "phaseName", width: 20 },
    { header: "Phase Lead", key: "phaseLead", width: 20 },
    { header: "Task Name", key: "taskName", width: 20 },
    { header: "Task Status", key: "taskStatus", width: 15 },
    { header: "Phase Completion Rate", key: "phaseCompletionRate", width: 20 },
    { header: "Remarks", key: "remarks", width: 50 }, // Assuming remarks are a concatenated string
  ];

  // Add rows to the worksheet for each project and its details
  data.forEach((project, projectIndex) => {
    // Add project information only once at the start of each project's details
    let projectInfoAdded = false;

    project.phases.forEach((phase) => {
      phase.tasks.forEach((task) => {
        let row = {
          projectName: projectInfoAdded ? null : project.projectName,
          projectDescription: projectInfoAdded
            ? null
            : project.projectDescription,
          startDate: projectInfoAdded ? null : project.startDate,
          endDate: projectInfoAdded ? null : project.endDate,
          completionRate: projectInfoAdded
            ? null
            : `${project.projectCompletionRate}%`,
          phaseName: phase.phaseName,
          phaseLead: phase.phaseLead,
          taskName: task.taskName,
          taskStatus: task.status,
          phaseCompletionRate: `${phase.phaseCompletionRate}%`,
        };

        worksheet.addRow(row);
        projectInfoAdded = true; // Set flag to true after first set of project details is added
      });
    });

    // Add the project's remarks at the end of the project's tasks
    if (project.remarks && project.remarks.length > 0) {
      worksheet.addRow({
        remarks: project.remarks.join("; "), // Join remarks with a semicolon and a space
      });
    }

    // Add a blank row after each project for better readability
    worksheet.addRow([]);
  });

  // Format the worksheet as needed
  // Apply styles, filters, etc. as per your requirements

  // Write to a file
  const filePath = path.join(__dirname, "report.xlsx");
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

const getOverallReport = async (req, res) => {
  try {
    const reportData = await generateReportData();
    res.json(reportData);
    // const filePath = await createExcelReport(reportData);

    // // Set the file to be downloaded
    // res.download(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating report");
  }
};

module.exports = {
  getOverallReport,
};
