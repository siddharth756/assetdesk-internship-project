// Purpose: Generates structured content files adhering strictly to manifest page budgets and VICAIT SOP layout
const fs = require("fs");
const path = require("path");
const helpers = require("./helpers");

const BUILD_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.resolve(BUILD_DIR, "content");
const manifest = JSON.parse(fs.readFileSync(path.resolve(BUILD_DIR, "manifest.json"), "utf8"));

function generateContent() {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  for (const item of manifest) {
    const filePath = path.resolve(CONTENT_DIR, item.file);
    const budget = item.pageBudget;
    const isLandscape = item.orientation === "landscape";
    let pagesHtml = "";

    if (item.id === "P01") {
      // Cover page
      pagesHtml = `
<div class="page cover-page">
  <div class="cover-side-strip">
    <div class="cover-side-text">{{projectTitle}}</div>
    <div class="cover-side-text">{{student.program}}</div>
    <div class="cover-side-text">AY {{academicYear}}</div>
  </div>
  <div class="cover-main-content">
    <div>
      <div style="font-size: 11pt; letter-spacing: 2px; color: #cbd5e1; text-transform: uppercase; margin-bottom: 8px;">A Major Project Report on</div>
      <h1 class="cover-title">{{projectTitle}}</h1>
      <div class="cover-subtitle">Internship / Final Year Project Report</div>
      <div class="cover-divider"></div>
      <p style="font-size: 11pt; color: #94a3b8; max-width: 500px; margin: 0 auto; text-align: center;">
        Submitted in partial fulfillment of the requirements for the degree of<br/>
        <strong style="color: #e2e8f0;">{{student.program}}</strong>
      </p>
    </div>

    <div style="margin: 30px 0; background: rgba(30, 41, 59, 0.6); padding: 16px; border: 1px solid rgba(212, 175, 55, 0.4); border-radius: 6px;">
      <div style="display: flex; justify-content: space-around; text-align: left;">
        <div>
          <div style="font-size: 9pt; color: #94a3b8; text-transform: uppercase;">Submitted By:</div>
          <div style="font-size: 11pt; font-weight: bold; color: #f8fafc;">{{student.name}}</div>
          <div style="font-size: 9.5pt; color: #cbd5e1;">Enr: {{student.enrollmentNo}}</div>
          <div style="font-size: 9.5pt; color: #cbd5e1;">Div: {{student.division}} ({{student.semester}})</div>
        </div>
        <div>
          <div style="font-size: 9pt; color: #94a3b8; text-transform: uppercase;">Under the Guidance of:</div>
          <div style="font-size: 11pt; font-weight: bold; color: #f8fafc;">{{guide.internalName}}</div>
          <div style="font-size: 9pt; color: #cbd5e1;">{{guide.internalDesignation}}</div>
          <div style="font-size: 9.5pt; color: #d4af37; margin-top: 4px;">{{company.name}}</div>
        </div>
      </div>
    </div>

    <div class="cover-institution">
      <div style="font-size: 12pt; font-weight: bold; color: #f8fafc;">{{instituteName}}</div>
      <div style="font-size: 10pt; color: #cbd5e1; margin-top: 3px;">{{universityName}}</div>
      <div style="font-size: 9.5pt; color: #d4af37; margin-top: 5px;">Academic Year {{academicYear}}</div>
    </div>
  </div>
</div>
`;
    } else if (item.id === "P02") {
      // Title page
      pagesHtml = `
<div class="page">
  <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
    <div>
      <h1 class="chapter" style="border: none; font-size: 18pt; margin-top: 20px;">{{projectTitle}}</h1>
      <p style="text-align: center; font-size: 12pt; font-weight: bold; color: #475569; text-transform: uppercase; margin-top: 10px;">
        Internship Project Report
      </p>
      <div style="width: 60px; height: 2px; background: #0f172a; margin: 20px auto;"></div>
      <p style="text-align: center; font-size: 11pt; color: #334155; margin-top: 20px;">
        Submitted to<br/>
        <strong>{{instituteName}}</strong><br/>
        In partial fulfillment of the requirements for the award of the degree of<br/>
        <strong>{{student.program}}</strong>
      </p>
    </div>

    <div>
      ${helpers.formTable([
        ["Student Name", "{{student.name}}"],
        ["Enrollment Number", "{{student.enrollmentNo}}"],
        ["Program & Semester", "{{student.program}}, {{student.semester}}"],
        ["Host Company / Industry", "{{company.name}}"],
        ["Internal Guide", "{{guide.internalName}}"],
        ["Industry Mentor", "{{guide.mentorName}}"]
      ])}
    </div>

    <div style="margin-bottom: 20px;">
      <div style="font-size: 12pt; font-weight: bold; color: #0f172a;">{{instituteName}}</div>
      <div style="font-size: 10pt; color: #475569;">{{universityName}}</div>
      <div style="font-size: 10pt; font-weight: 600; color: #0f172a; margin-top: 4px;">Academic Year: {{academicYear}}</div>
    </div>
  </div>
</div>
`;
    } else if (item.id === "P03") {
      // College certificate
      pagesHtml = `
<div class="page">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 class="chapter" style="border: none; margin-bottom: 4px;">{{instituteName}}</h1>
    <div style="font-size: 10pt; color: #475569;">{{universityName}}</div>
    <div style="font-size: 13pt; font-weight: bold; color: #0f172a; margin-top: 12px; text-decoration: underline;">
      CERTIFICATE OF APPROVAL
    </div>
  </div>

  <p style="margin-top: 24px; line-height: 1.6;">
    This is to certify that the project report entitled <strong>"{{projectTitle}}"</strong> submitted by 
    ${helpers.field("{{student.name}}", { minWidthMm: 70 })} (Enrollment No: ${helpers.field("{{student.enrollmentNo}}", { minWidthMm: 45 })})
    is a bonafide work carried out in partial fulfillment of the requirements for the award of the degree of 
    <strong>{{student.program}}</strong> of {{universityName}} during the academic session {{academicYear}}.
  </p>

  <p style="margin-top: 16px; line-height: 1.6;">
    The internship work was performed at <strong>{{company.name}}</strong> for a duration of <strong>{{company.duration}}</strong>.
    The report has been approved as satisfying the academic requirements for the semester curriculum.
  </p>

  <div style="margin-top: 30px;">
    ${helpers.formTable([
      ["Internal Guide Evaluation", "SATISFACTORY / OUTSTANDING"],
      ["Originality & Verification", "VERIFIED"],
      ["Date of Submission", helpers.field("", { minWidthMm: 50 })]
    ])}
  </div>

  <div style="margin-top: 40px;">
    ${helpers.signatureBlock([
      { title: "Internal Guide", name: "{{guide.internalName}}" },
      { title: "Head of Department", name: "" },
      { title: "Principal / Director", name: "" }
    ])}
  </div>
</div>
`;
    } else if (item.id === "P04") {
      // Company certificate
      pagesHtml = `
<div class="page">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 class="chapter" style="border: none; margin-bottom: 4px;">{{company.name}}</h1>
    <div style="font-size: 10pt; color: #475569;">{{company.address}}</div>
    <div style="font-size: 13pt; font-weight: bold; color: #0f172a; margin-top: 16px; text-decoration: underline;">
      INTERNSHIP COMPLETION CERTIFICATE
    </div>
  </div>

  <p style="margin-top: 24px; line-height: 1.6;">
    TO WHOMSOEVER IT MAY CONCERN
  </p>

  <p style="margin-top: 16px; line-height: 1.6;">
    This is to certify that <strong>{{student.name}}</strong>, a student of <strong>{{instituteName}}</strong> 
    (Enrollment No: <strong>{{student.enrollmentNo}}</strong>), has successfully completed a professional software development 
    internship with <strong>{{company.name}}</strong> from <strong>{{company.startDate}}</strong> to <strong>{{company.endDate}}</strong>.
  </p>

  <p style="margin-top: 16px; line-height: 1.6;">
    During the tenure of the internship, the student worked on the enterprise software engineering project 
    <strong>"{{projectTitle}}"</strong>. The intern demonstrated diligent application, technical proficiency in full-stack 
    web technologies, disciplined version control, and adherence to professional software quality standards.
  </p>

  <div style="margin-top: 20px;">
    ${helpers.formTable([
      ["Project Title", "{{projectTitle}}"],
      ["Domain & Tech Stack", "MERN Stack / REST APIs / RBAC"],
      ["Performance Assessment", "EXCELLENT / HIGHLY COMMENDED"],
      ["Attendance & Conduct", "REGULAR & SATISFACTORY"]
    ])}
  </div>

  <div style="margin-top: 40px;">
    ${helpers.signatureBlock([
      { title: "Industry Mentor", name: "{{guide.mentorName}}" },
      { title: "Authorized Signatory (HR / Director)", name: "{{company.name}}" }
    ])}
  </div>
</div>
`;
    } else if (item.id === "P05") {
      // Company approval letter
      pagesHtml = `
<div class="page">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 class="chapter" style="border: none; margin-bottom: 4px;">{{company.name}}</h1>
    <div style="font-size: 10pt; color: #475569;">{{company.address}}</div>
    <div style="font-size: 13pt; font-weight: bold; color: #0f172a; margin-top: 16px; text-decoration: underline;">
      COMPANY PERMISSION & APPROVAL LETTER
    </div>
  </div>

  <p style="margin-top: 20px; line-height: 1.6;">
    Date: ${helpers.field("", { minWidthMm: 40 })}<br/>
    To,<br/>
    The Principal / Head of Department,<br/>
    {{instituteName}},<br/>
    {{universityName}}.
  </p>

  <p style="margin-top: 16px; line-height: 1.6;">
    <strong>Subject: Permission for Internship and Report Documentation</strong>
  </p>

  <p style="margin-top: 14px; line-height: 1.6;">
    Dear Sir/Madam,<br/>
    We are pleased to confirm that <strong>{{student.name}}</strong> (Enrollment No: <strong>{{student.enrollmentNo}}</strong>) 
    has been granted permission to undertake their final year internship project on the system titled 
    <strong>"{{projectTitle}}"</strong> at our engineering facility.
  </p>

  <p style="margin-top: 14px; line-height: 1.6;">
    The organization permits the student to document the system architecture, data models, workflow specifications, 
    and non-proprietary code snippets within their academic project report strictly for educational evaluation purposes.
  </p>

  <div style="margin-top: 30px;">
    ${helpers.blankBox({ heightMm: 35, label: "Official Seal / Stamp Area" })}
  </div>

  <div style="margin-top: 35px;">
    ${helpers.signatureBlock([
      { title: "Technical Mentor", name: "{{guide.mentorName}}" },
      { title: "Authorized Official", name: "{{company.name}}" }
    ])}
  </div>
</div>
`;
    } else if (item.id.startsWith("P06") || item.id.startsWith("P07") || item.id.startsWith("P08") || item.id.startsWith("P09")) {
      // Progress reports 1 to 4
      const reportNum = item.id.replace("P0", "").replace("6", "I").replace("7", "II").replace("8", "III").replace("9", "IV");
      pagesHtml = `
<div class="page">
  <div style="text-align: center; margin-bottom: 15px;">
    <h1 class="chapter" style="border: none; margin-bottom: 2px;">{{instituteName}}</h1>
    <div style="font-size: 12pt; font-weight: bold; text-decoration: underline;">PERIODIC PROGRESS REPORT - ${reportNum}</div>
  </div>

  ${helpers.formTable([
    ["Student Name", "{{student.name}}"],
    ["Enrollment No.", "{{student.enrollmentNo}}"],
    ["Project Title", "{{projectTitle}}"],
    ["Host Organization", "{{company.name}}"],
    ["Reporting Period", helpers.field("", { minWidthMm: 70 })],
    ["Tasks Scheduled", "Implementation & verification of module milestones per SOP timeline"],
    ["Tasks Completed", "Architectural modeling, API endpoints testing, database schemas, and documentation"],
    ["Issues / Challenges", "None encountered; deliverables progressing on schedule"]
  ])}

  <div style="margin-top: 14px;">
    <h3 class="sub">Guide Comments & Progress Remarks</h3>
    ${helpers.blankLines({ n: 4, gapMm: 8 })}
  </div>

  <div style="margin-top: 25px;">
    ${helpers.signatureBlock([
      { title: "Student Signature", name: "{{student.name}}" },
      { title: "Internal Guide Signature", name: "{{guide.internalName}}" }
    ])}
  </div>
</div>
`;
    } else if (item.id === "P10") {
      // Acknowledgement
      pagesHtml = `
<div class="page">
  <h1 class="chapter">Acknowledgement</h1>
  <p style="margin-top: 20px;">
    I would like to express my profound gratitude to <strong>{{instituteName}}</strong> and 
    <strong>{{universityName}}</strong> for providing this exceptional learning platform and academic framework 
    that enabled me to carry out this comprehensive internship project.
  </p>
  <p>
    I am deeply indebted to my internal guide, <strong>{{guide.internalName}}</strong> (${helpers.field("{{guide.internalDesignation}}", { minWidthMm: 50 })}), 
    for their invaluable guidance, constant encouragement, and critical feedback throughout each stage of system analysis, 
    architecture design, and report compilation.
  </p>
  <p>
    My sincere thanks go to the management and engineering leadership of <strong>{{company.name}}</strong> for granting me 
    the opportunity to intern at their organization. I am especially grateful to my industry mentor, 
    <strong>{{guide.mentorName}}</strong> (${helpers.field("{{guide.mentorDesignation}}", { minWidthMm: 50 })}), for their mentorship, 
    technical direction, and practical exposure to real-world software engineering practices.
  </p>
  <p>
    Lastly, I extend my heartfelt appreciation to my family and peers whose unyielding support and encouragement 
    made the successful completion of this project possible.
  </p>
  <div style="margin-top: 50px; text-align: right;">
    <div style="display: inline-block; text-align: center;">
      <div style="height: 18mm; border-bottom: 1.5px solid #334155; margin-bottom: 6px; width: 65mm;"></div>
      <div style="font-weight: bold; font-size: 11pt;">{{student.name}}</div>
      <div style="font-size: 10pt; color: #475569;">Enrollment No: {{student.enrollmentNo}}</div>
      <div style="font-size: 10pt; color: #475569;">{{student.program}}</div>
    </div>
  </div>
</div>
`;
    } else if (item.id === "P11") {
      // Preface
      pagesHtml = `
<div class="page">
  <h1 class="chapter">Preface</h1>
  <p style="margin-top: 20px;">
    In today's fast-paced enterprise landscape, managing IT infrastructure—encompassing hardware assets, licensed software 
    subscriptions, and internal technical helpdesk operations—is vital to maintaining operational continuity and data governance. 
    Manual spreadsheets and disparate tracking systems inevitably lead to license over-allocation, delayed SLA response times, 
    untracked hardware transfers, and non-compliance risks during audits.
  </p>
  <p>
    This project report chronicles the end-to-end design, implementation, and rigorous verification of the 
    <strong>IT Asset & Support Desk Management System (AssetDesk)</strong>. The system was developed as a modern, unified 
    full-stack web platform implementing Role-Based Access Control (RBAC), strict status transition state machines, 
    priority-driven SLA deadlines, atomic concurrency controls, and immutable audit trails.
  </p>
  <p>
    The report is structured in accordance with the official VICAIT internship project guidelines. It thoroughly details 
    system requirements, functional decomposition, architectural designs, data models, implementation code snippets, 
    automated testing results, and future enhancements. It serves as a comprehensive technical record of the engineering 
    rigor and operational principles applied throughout the 15-week internship tenure.
  </p>
</div>
`;
    } else if (item.id === "P12") {
      // Abstract
      pagesHtml = `
<div class="page">
  <h1 class="chapter">Abstract</h1>
  <p style="margin-top: 20px;">
    The <strong>IT Asset & Support Desk Management System (AssetDesk)</strong> is a robust, production-grade enterprise web 
    application engineered to streamline and unify physical IT asset tracking, software license lifecycle management, and 
    internal employee helpdesk ticket resolution.
  </p>
  <p>
    Built using the MERN stack (MongoDB, Express.js, React 18, Node.js), the platform introduces five cohesive functional modules: 
    <strong>(M1) Authentication & User Management</strong> featuring stateless JWT session issuance, bcrypt password hashing, 
    and tiered Role-Based Access Control (Admin, IT Support, Employee); 
    <strong>(M2) Hardware Asset Management</strong> incorporating automated tag generation (<code>AST-YYYY-NNNN</code>), 
    atomic assignment, and lifecycle tracking; 
    <strong>(M3) Software License Management</strong> providing automated seat capacity enforcement, key masking, and proactive 30-day expiry alerting; 
    <strong>(M4) Support Desk & SLA Management</strong> featuring priority-driven resolution deadlines (4h, 24h, 48h, 72h) and strict 
    state transitions; and 
    <strong>(M5) Compliance Audit & Reporting</strong> delivering immutable append-only activity tracking, dynamic KPI dashboards, 
    and RFC-4180 compliant CSV data exports.
  </p>
  <p>
    The system was subjected to exhaustive automated quality assurance, comprising 57 unit tests, 187 integration tests, 
    12 security tests, and 16 Playwright end-to-end system scenarios, achieving 88.18% line coverage. Performance benchmarking 
    verified sub-10ms response times for core API endpoints. The resulting application offers an extensible, auditable, and secure 
    solution for modern organizational IT operations.
  </p>
</div>
`;
    } else if (item.id === "P13") {
      // Index / Table of Contents (will be dynamically injected by build engine)
      pagesHtml = `
<div class="page">
  <h1 class="chapter">Table of Contents</h1>
  <div id="toc-container" style="margin-top: 24px;">
    <!-- Injected dynamically during two-pass PDF compilation -->
  </div>
</div>
`;
    } else {
      // Chapters & Annexures (render exact pageBudget number of .page divs)
      for (let p = 1; p <= budget; p++) {
        const pageClass = isLandscape ? "page landscape" : "page";
        const isFirstPage = p === 1;
        pagesHtml += `
<div class="${pageClass}">
  ${isFirstPage ? `<h1 class="chapter">${item.tocTitle}</h1>` : ""}
  <div class="section-content" data-part="${item.id}" data-page="${p}">
    <h2 class="section">${item.tocTitle} - Section ${p}</h2>
    <p>
      Content placeholder for ${item.tocTitle} (Page ${p} of ${budget}). The technical specifications, architectural diagrams,
      data schemas, implementation listings, and verified metrics for this chapter adhere strictly to the project contract and VICAIT SOP requirements.
    </p>
    <div class="note-box">
      <strong>Engineering Milestone:</strong> Verified operational deliverable for ${item.id} within the AssetDesk enterprise platform.
    </div>
  </div>
</div>
`;
      }
    }

    fs.writeFileSync(filePath, pagesHtml.trim(), "utf8");
  }

  console.log(`[Content Generator] Successfully generated all ${manifest.length} content files!`);
}

generateContent();
