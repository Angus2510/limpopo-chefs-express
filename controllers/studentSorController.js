exports.getStudentSorById = async (req, res) => {
  try {
    const { studentId } = req.params; // Get the student ID from request params

    // Validate student ID
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    // Fetch the student by ID
    const student = await Student.findById(studentId)
      .select(
        "admissionNumber profile.firstName profile.lastName profile.dateOfBirth campus qualification"
      )
      .populate("campus", "title")
      .populate("qualification", "title"); // Populate qualification

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // Fetch results for this student
    const results = await Result.find({ "results.student": studentId })
      .populate("results.student")
      .populate("outcome");

    if (!results.length) {
      return res
        .status(404)
        .json({ message: "No results found for this student." });
    }

    // Initialize overall outcome
    let overallOutcome = "C"; // Default outcome

    // Sort the results based on outcome title
    results.sort((a, b) => {
      const outcomeA = a.outcome ? a.outcome.title : "Unknown";
      const outcomeB = b.outcome ? b.outcome.title : "Unknown";
      return outcomeA.localeCompare(outcomeB);
    });

    // Create the HTML content for this student's SOR
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; }
            .header img { width: 300px; height: auto; }
            .title { font-size: 24px; margin-top: 20px; font-weight: bold; margin-bottom: 5px; }

            .student-details-table, .results-table, .additional-table { font-size: 12px; } 
            .qualification {margin-bottom: 30px}
            .student-details-table { margin-bottom: 20px; border-collapse: collapse; }
            .student-details-table th, .student-details-table td { padding: 4px 8px; text-align: left; border: none; }
            .student-details-table th { font-weight: normal; } 
            .student-details-table td { font-weight: bold; }
            
            .certification { font-size: 12px; margin-bottom: 20px; }
            .results-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .results-table th, .results-table td { border: 1px solid #ddd; padding: 4px; text-align: left; }
            .results-table th { background-color: #f2f2f2; }
            .footer { font-size: 12px; text-align: left; margin-top: 20px; margin-bottom: 40px; }
            .final-outcome { font-size: 16px; margin-top: 20px; text-align: center; }
            .additional-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .additional-table th, .additional-table td { border: 1px solid #ddd; padding: 4px; text-align: left; }
            .additional-table th { background-color: #f2f2f2; }
            h2 { text-align: left; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoBase64}" alt="Logo">
            <div class="title">Statement of Results</div>
            <div class="qualification">${student.qualification
              .map((q) => q.title)
              .join(", ")}</div>
          </div>

          <table class="student-details-table">
            <tr>
              <th>Date of Print:</th>
              <td>${new Date().toLocaleDateString()}</td>
            </tr>
            <tr>
              <th>Student No:</th>
              <td>${student.admissionNumber}</td>
            </tr>
            <tr>
              <th>Student Name:</th>
              <td>${student.profile.firstName} ${student.profile.lastName}</td>
            </tr>
            <tr>
              <th>School Name:</th>
              <td>Limpopo Chefs Academy</td>
            </tr>
            <tr>
              <th>Campus:</th>
              <td>${student.campus.map((c) => c.title).join(", ")}</td>
            </tr>
          </table>

          <div class="certification">
            <p>This certifies that the above student has achieved the below results for the academic year as of the date of print of this statement of results.</p>
          </div>
          <div class="results">
            <table class="results-table">
              <tr>
                <th>Outcome</th>
                <th>Test Score</th>
                <th>Task Score</th>
                <th>Outcome Result</th>
                <th>Overall Outcome</th>
              </tr>
              ${studentResults
                .map((result) => {
                  const studentResult = result.results.find(
                    (r) => r.student._id.toString() === student._id.toString()
                  );
                  const outcomeTitle = result.outcome
                    ? result.outcome.title
                    : "Unknown";

                  if (
                    result.resultType === "Theory" &&
                    studentResult.testScore === 0 &&
                    studentResult.taskScore === 0
                  ) {
                    return "";
                  }

                  if (
                    result.resultType !== "Theory" &&
                    studentResult.score === 0
                  ) {
                    return "";
                  }

                  let testScore = "";
                  let taskScore = "";
                  let individualOutcome;
                  let competent;

                  if (result.resultType === "Theory") {
                    const averageScore =
                      (studentResult.testScore + studentResult.taskScore) / 2;
                    individualOutcome = round(averageScore);
                    testScore = `${round(studentResult.testScore)}%`;
                    taskScore = `${round(studentResult.taskScore)}%`;
                    competent = individualOutcome >= 60 ? "C" : "NYC";
                  } else if (result.resultType === "Practical") {
                    individualOutcome = round(studentResult.score);
                    competent = individualOutcome >= 70 ? "C" : "NYC";
                  } else if (result.resultType === "Exam/Well") {
                    individualOutcome = round(studentResult.score);
                    competent = individualOutcome >= 60 ? "C" : "NYC";
                  }

                  if (competent === "NYC") {
                    overallOutcome = "NYC";
                  }

                  if (individualOutcome === undefined) {
                    return "";
                  }

                  return `
                  <tr>
                    <td>${outcomeTitle}</td>
                    <td>${testScore}</td>
                    <td>${taskScore}</td>
                    <td>${individualOutcome}%</td>
                    <td>${competent}</td>
                  </tr>
                `;
                })
                .join("")}
            </table>
            <div class="final-outcome">
              <p>Final Outcome: ${overallOutcome}</p>
            </div>
          </div>
          <div class="footer">
            <p>Please note: This is a computer-generated copy. No manual alterations to be accepted.</p>
            <p>Should you wish to receive a verified and signed copy of this Statement of Results, please contact the respective campus:</p>
            <p>Mokopane (015) 491 1226 or reception@limpopochefs.co.za</p>
            <p>Polokwane (015) 292 0102 or polokwane@limpopochefs.co.za</p>
          </div>
          <div>
                    

              <h2>Knowledge Modules: Mapping</h2>
              <table class="additional-table">
                <tr>
                  <th>Unit Number</th>
                  <th>Limpopo Chefs Academy Unit Title</th>
                  <th>QCTO KM</th>
                  <th>City & Guilds #</th>
                </tr>
                <tr>
                  <td>1:01</td>
                  <td>Introduction to Food Costing 1.0</td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>1:02</td>
                  <td>Introduction to French 1.0</td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>1:03</td>
                  <td>Introduction to the Hospitality Industry</td>
                  <td>15 (KT01-02)</td>
                  <td>101, 201</td>
                </tr>
                <tr>
                  <td>1:04</td>
                  <td>Introduction to Nutrition and Healthy Eating</td>
                  <td>09 (KT01-02)</td>
                  <td>105</td>
                </tr>
                <tr>
                  <td>1:05</td>
                  <td>Essential Knife Skills</td>
                  <td></td>
                  <td>308</td>
                </tr>
                <tr>
                  <td>1:06</td>
                  <td>Food Safety and Quality Assurance</td>
                  <td>02 (KT01-03)</td>
                  <td>207</td>
                </tr>
                <tr>
                  <td>1:07</td>
                  <td>Health and Safety in the Workplace</td>
                  <td>03 (KT01-03)</td>
                  <td>113</td>
                </tr>
                <tr>
                  <td>1:08</td>
                  <td>Personal Hygiene in the Workplace</td>
                  <td>01 (KT01-03)</td>
                  <td>112, 205</td>
                </tr>
                <tr>
                  <td>1:09</td>
                  <td>Food Preparation Methods, Techniques and Equipment</td>
                  <td>21 (KT01-04)</td>
                  <td>114</td>
                </tr>
                <tr>
                  <td>1:10</td>
                  <td>Food Cooking Methods & Techniques</td>
                  <td>22 (KT01-03)</td>
                  <td>106, 210, 211, 212, 213</td>
                </tr>
                <tr>
                  <td>1:11</td>
                  <td>Food Commodities & Basic Ingredients</td>
                  <td>11 (KT01-02)</td>
                  <td>108</td>
                </tr>
                <tr>
                  <td>1:12</td>
                  <td>Theory of Food Production & Customer Service</td>
                  <td>13 (KT01-03)</td>
                  <td>122</td>
                </tr>
                <tr>
                  <td>1:13</td>
                  <td>Numeracy and Units of Measurement</td>
                  <td>05 (KT01-02)</td>
                  <td></td>
                </tr>
                <tr>
                  <td>1:14</td>
                  <td>Introduction: Meal Planning and Menus</td>
                  <td>20 (KT01)</td>
                  <td>123, 125</td>
                </tr>
                <tr>
                  <td>1:15</td>
                  <td>Computer Literacy and Research</td>
                  <td>6 (KT01-02)</td>
                  <td>NA</td>
                </tr>
                <tr>
                  <td>1:16</td>
                  <td>Environmental Awareness</td>
                  <td>7 (KT01-02)</td>
                  <td>305</td>
                </tr>
                <tr>
                  <td>1:17</td>
                  <td>Personal Development as a Chef</td>
                  <td>24 (KT01-04)</td>
                  <td>115</td>
                </tr>
                <tr>
                  <td>FT01</td>
                  <td>Final 1st year Task (as per qualification handbook)<br>Introduction to the Hospitality Industry<br>Introduction to Nutrition and Healthy Eating<br>Food Cooking Methods & Techniques<br>Food Commodities & Basic Ingredients<br>Personal Hygiene in the Workplace<br>Health and Safety in the Workplace<br>Personal Development as a Chef<br>Introduction: Meal Planning and Menus</td>
                  <td></td>
                  <td>101, 105, 106, 108, 112, 113, 115, 123, E308</td>
                </tr>
                <tr>
                  <td>2:01</td>
                  <td>Environmental Sustainability</td>
                  <td>08 (KT01-03)</td>
                  <td>204</td>
                </tr>
                <tr>
                  <td>2:02</td>
                  <td>Advanced Menu Planning and Costing</td>
                  <td>20 (KT01-02)</td>
                  <td>208</td>
                </tr>
                <tr>
                  <td>2:03</td>
                  <td>Theory of Preparing, Cooking and Finishing Dishes</td>
                  <td>23 (KT01-12)</td>
                  <td>209, 307, 308, 309</td>
                </tr>
                <tr>
                  <td>2:04</td>
                  <td>Theory of Facility and Equipment Resource Management</td>
                  <td>17 (KT01-02)</td>
                  <td></td>
                </tr>
                <tr>
                  <td>2:05</td>
                  <td>Staff Resource Management and Self Development</td>
                  <td>16 (KT01-02)</td>
                  <td>206</td>
                </tr>
                <tr>
                  <td>2:06</td>
                  <td>Theory of Commodity Resource Management</td>
                  <td>18 (KT01-02)</td>
                  <td></td>
                </tr>
                <tr>
                  <td>2:07</td>
                  <td>Understand Business Success</td>
                  <td></td>
                  <td>202</td>
                </tr>
                <tr>
                  <td>2:08</td>
                  <td>Provide Guest Service</td>
                  <td></td>
                  <td>203</td>
                </tr>
                <tr>
                  <td>2:09</td>
                  <td>Preparation and Cooking: Nutrition & Healthier Foods</td>
                  <td>10 (KT01-02)</td>
                  <td></td>
                </tr>
                <tr>
                  <td>FT02</td>
                  <td>Final 2nd Year Task (as per qualification handbook)<br>Personal Hygiene in the Workplace<br>Staff Resource Management and Self Development<br>Advanced Menu Planning and Costing</td>
                  <td></td>
                  <td>205, 206, 208</td>
                </tr>
                <tr>
                  <td>3:01</td>
                  <td>Theory of Safety Supervision</td>
                  <td>04 (KT01-03)</td>
                  <td>306</td>
                </tr>
                <tr>
                  <td>3:02</td>
                  <td>Theory of Food Production Supervision</td>
                  <td>14 (KT01-02)</td>
                  <td>302</td>
                </tr>
                <tr>
                  <td>3:03</td>
                  <td>Contribute to Business Success</td>
                  <td></td>
                  <td>303</td>
                </tr>
                <tr>
                  <td>3:04</td>
                  <td>Contribute to the Guest Experience</td>
                  <td></td>
                  <td>304</td>
                </tr>
                <tr>
                  <td>3:05</td>
                  <td>Developing Opportunities for Progression in the Culinary Industry</td>
                  <td></td>
                  <td>301</td>
                </tr>
                <tr>
                  <td>3:06</td>
                  <td>Gastronomy and Global Cuisines</td>
                  <td>12 (KT01-04)</td>
                  <td></td>
                </tr>
                <tr>
                  <td>3:07</td>
                  <td>Operational Cost Control</td>
                  <td>19 (KT01-05)</td>
                  <td></td>
                </tr>
                <tr>
                  <td>FT03</td>
                  <td>Final 3rd Year Task (as per qualification handbook)<br>Plan menus and cost recipes/dishes.<br>Manage and maintain staff, facility, equipment and commodity resources.<br>Maintain food production systems.<br>Implement and maintain cost control in catering.</td>
                  <td>PM03, PM04, PM05, PM06 </td>
              </tr>
              </table>



              <h2>Pastry Modules: Mapping</h2>
              <table class="additional-table">
                <tr>
                  <th>Unit Number</th>
                  <th>Limpopo Chefs Academy Unit Title</th>
                  <th>QCTO KM</th>
                  <th>City & Guilds #</th>
                </tr>
                <tr>
                  <td>P02:01</td>
                  <td>Understand the Hospitality Industry</td>
                  <td></td>
                  <td>201, 205</td>
                </tr>
                <tr>
                  <td>P02:02</td>
                  <td>Understand Business Success</td>
                  <td></td>
                  <td>202</td>
                </tr>
                <tr>
                  <td>P02:03</td>
                  <td>Provide Guest Service</td>
                  <td></td>
                  <td>203</td>
                </tr>
                <tr>
                  <td>P02:04</td>
                  <td>Awareness of Sustainability in the Hospitality Industry</td>
                  <td></td>
                  <td>204</td>
                </tr>
                <tr>
                  <td>P02:05</td>
                  <td>Understand Own Role in Self Development</td>
                  <td></td>
                  <td>206</td>
                </tr>
                <tr>
                  <td>P02:06</td>
                  <td>Food Safety</td>
                  <td></td>
                  <td>207</td>
                </tr>
                <tr>
                  <td>P02:07</td>
                  <td>Meet Guest Requirements through Menu Planning</td>
                  <td></td>
                  <td>208</td>
                </tr>
                <tr>
                  <td>P02:08</td>
                  <td>Prepare, Cook and Finish Cakes, Biscuits and Sponge products using Standardised Recipes</td>
                  <td></td>
                  <td>215</td>
                </tr>
                <tr>
                  <td>P02:09</td>
                  <td>Prepare, Cook and Finish Pastry Products using Standardised Recipes</td>
                  <td></td>
                  <td>216</td>
                </tr>
                <tr>
                  <td>P02:10</td>
                  <td>Prepare, Cook and Finish Dough Products using Standardised Recipes</td>
                  <td></td>
                  <td>217</td>
                </tr>
                <tr>
                  <td>P02:11</td>
                  <td>Prepare, Cook and Finish Hot Desserts using Standardised Recipes</td>
                  <td></td>
                  <td>218</td>
                </tr>
                <tr>
                  <td>P02:12</td>
                  <td>Prepare, Cook and Finish Cold Desserts using Standardised Recipes</td>
                  <td></td>
                  <td>219</td>
                </tr>
                <tr>
                  <td>P02:13</td>
                  <td>Prepare and Finish Simple Chocolate Products using Standardised Recipes</td>
                  <td></td>
                  <td>220</td>
                </tr>
              </table>


              <h2>Practical Modules: Mapping</h2>
              <table class="additional-table">
                <tr>
                  <th>Unit Number</th>
                  <th>Unit Title</th>
                  <th>QCTO PM</th>
                  <th>City & Guilds #</th>
                </tr>
                <tr>
                  <td>Menu A1<br>Menu A2<br>Menu A3<br>Menu A4<br>Menu A5<br>Menu A6<br>Menu A7<br>Menu A8<br>Menu A9<br>Menu A10<br>Menu A11<br>Menu A12<br>Menu A13<br>Menu A14<br>Menu A15<br>Menu A16<br>Menu A17<br>Menu A18</td>
                  <td>Prepare and cook food items using different methods and techniques, equipment and utensils.<br>Prepare, cook and finish dishes using different methods and techniques, equipment and utensils.<br>Basic food preparation and cooking.<br>Preparation of convenience products for the catering industry.<br>Meal planning and preparation.</td>
                  <td>PM01<br>PM02</td>
                  <td>106<br>122<br>123</td>
                </tr>
                <tr>
                  <td>Menu B1<br>Menu B2<br>Menu B3<br>Menu B4<br>Menu B5<br>Menu B6<br>Menu B7<br>Menu B8<br>Menu B9</td>
                  <td>Prepare and cook food items using different methods and techniques, equipment and utensils.<br>Prepare, cook and finish dishes using different methods and techniques, equipment and utensils.<br>Plan menus and cost recipes/dishes.<br>Manage and maintain staff, facility, equipment and commodity resources.<br>Maintain food production systems.<br>Implement and maintain cost control in catering.<br>Professional workplace standards.<br>Understand own role in self development.<br>Meet guest requirements through menu planning.<br>Mise en place.<br>Cooking methods, techniques and commodities: boiling, poaching and steaming.<br>Cooking methods, techniques and commodities: stewing and braising.<br>Cooking methods, techniques and commodities: baking, roasting and grilling.<br>Cooking methods, techniques and commodities: deep and shallow frying.</td>
                  <td>PM01<br>PM02<br>PM03<br>PM04<br>PM05<br>PM06</td>
                  <td>205<br>206<br>208<br>209<br>210<br>211<br>212<br>213</td>
                </tr>
                <tr>
                  <td>Menu C1<br>Menu C2<br>Menu C3<br>Menu C4<br>Menu C5<br>Menu C6</td>
                  <td>Prepare and cook food items using different methods and techniques, equipment and utensils.<br>Prepare, cook and finish dishes using different methods and techniques, equipment and utensils.<br>Plan menus and cost recipes/dishes.<br>Manage and maintain staff, facility, equipment and commodity resources.<br>Maintain food production systems.<br>Implement and maintain cost control in catering.<br>Developing opportunities for progression in the culinary industry.<br>Supervise and monitor own section.<br>Produce and present advanced starters using standardised recipes.<br>Produce and present advanced main course dishes using standardised recipes.<br>Produce and present advanced desserts and dough using standardised recipes.</td>
                  <td>PM01<br>PM02<br>PM03<br>PM04<br>PM05<br>PM06</td>
                  <td>301<br>302<br>307<br>308<br>309</td>
                </tr>
                <tr>
                  <td>Menu P1<br>Menu P2<br>Menu P3<br>Menu P4<br>Menu P5<br>Menu P6<br>Menu P7<br>Menu P8<br>Menu P9<br>Menu P10<br>Menu P11</td>
                  <td>Prepare and cook food items using different methods and techniques, equipment and utensils.<br>Prepare, cook and finish dishes using different methods and techniques, equipment and utensils.<br>Professional workplace standards.<br>Understand own role in self development.<br>Meet guest requirements through menu planning.<br>Mise en place.<br>Prepare, cook and finish cakes, biscuits and sponge products using standardised recipes.<br>Prepare, cook and finish pastry products using standardised recipes.<br>Prepare, cook and finish dough products using standardised recipes.<br>Prepare, cook and finish hot desserts using standardised recipes.<br>Prepare, cook and finish cold desserts using standardised recipes.<br>Prepare, cook and finish simple chocolate products using standardised recipes.</td>
                  <td>PM01<br>PM02</td>
                  <td>205<br>206<br>208<br>209<br>215<br>216<br>217<br>218<br>219<br>220</td>
                </tr>
              </table>               

            </div>
        </body>
      </html>
    `;

    // Generate the PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "40px", bottom: "40px", left: "40px", right: "40px" },
      timeout: 60000, // Increase the timeout to 60 seconds
    });

    await browser.close();

    // Define the file name
    const fileName = `${student.admissionNumber}_${
      new Date().toISOString().split("T")[0]
    }_sor.pdf`;

    // Set the response headers to download the PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    // Send the PDF as the response
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF for student:", error);
    res.status(500).json({ message: "Error generating student SOR" });
  }
};
