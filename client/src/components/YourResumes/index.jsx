import React, { useState } from "react";
import jsPDF from "jspdf";
import Navbar from "../Navbar";
import "./index.css";

const YourResumes = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [jobDescription, setJobDescription] = useState("");

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError("");
  };

  const getVerdict = (score) => {
    if (score >= 90) return { label: "Strong Match", className: "verdict-strong" };
    if (score >= 70) return { label: "Good Match", className: "verdict-good" };
    return { label: "Needs Improvement", className: "verdict-weak" };
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      setError("Please select a PDF file first");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter a job description");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("resume", selectedFile);

      const uploadResponse = await fetch("https://resume-ats-project-2.onrender.com/resume/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setError(data.error || "Upload failed");
        setLoading(false);
        return;
      }

      const rawData = {
        resumeText: data.text,
        jobDescription: jobDescription,
      };

      const analyzeResponse = await fetch("https://resume-ats-project-2.onrender.com/resume/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rawData),
      });

      const analyzeData = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        setError(analyzeData.error || "Analysis failed");
        setLoading(false);
        return;
      }

      setAnalysisResult(analyzeData);
      setShowModal(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const report =
      analysisResult.suggestions?.analysis ??
      analysisResult.suggestions ??
      analysisResult;

    const score = report.atsScore ?? analysisResult.atsScore;
    const verdict = getVerdict(score);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const addWrappedText = (text, fontSize = 11, gap = 7) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += gap;
      });
    };

    const addSection = (title, items) => {
      if (!items || items.length === 0) return;
      y += 4;
      doc.setFont(undefined, "bold");
      addWrappedText(title, 13, 8);
      doc.setFont(undefined, "normal");
      items.forEach((item) => addWrappedText(`• ${item}`, 10, 6));
    };

    doc.setFont(undefined, "bold");
    addWrappedText("ATS Resume Analysis Report", 16, 10);
    doc.setFont(undefined, "normal");
    addWrappedText(`ATS Score: ${score}%  |  Verdict: ${verdict.label}`, 12, 10);

    addSection("Strengths", report.strengths);
    addSection("Missing Skills", report.missingSkills);
    addSection("Suggestions", report.suggestions);
    addSection("Improved Bullet Points", report.bulletPointImprovements);

    doc.save("ATS_Resume_Report.pdf");
  };

  return (
    <div className="resumes-page">
      <Navbar />

      <div className="resumes-hero">
        <h1>Analyze Your Resume</h1>
        <p>Upload your resume and paste a job description to get your ATS score</p>
      </div>

      <div className="resume-container">
        {error && <p className="error-text">{error}</p>}

        <label className="upload-label">Resume (PDF)</label>
        <label className="dropzone">
          <input type="file" accept=".pdf" onChange={handleFileChange} hidden />
          {selectedFile ? (
            <span className="dropzone-filename">📄 {selectedFile.name}</span>
          ) : (
            <span>Click to select a PDF file</span>
          )}
        </label>

        <label className="upload-label">Job Description</label>
        <textarea
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={6}
          className="job-description-textarea"
        />

        <button onClick={handleUploadAndAnalyze} disabled={loading} className="analyze-btn">
          {loading ? "Analyzing..." : "Upload & Analyze →"}
        </button>

        {analysisResult && (
          <button onClick={() => setShowModal(true)} className="view-report-btn">
            View Report
          </button>
        )}
      </div>

      {showModal && analysisResult?.success && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="close-btn" onClick={() => setShowModal(false)}>
              ✕
            </button>
            <h2>ATS Resume Analysis Report</h2>
            {(() => {
              const report =
                analysisResult.suggestions?.analysis ??
                analysisResult.suggestions ??
                analysisResult;

              const score = report.atsScore ?? analysisResult.atsScore;
              const verdict = getVerdict(score);

              return (
                <div className="report-content">
                  <div className="score-card">
                    <span className="score-value">{score}%</span>
                    <span className="score-label">ATS Score</span>
                    <span className={`verdict-badge ${verdict.className}`}>
                      {verdict.label}
                    </span>
                  </div>

                  {report.strengths && (
                    <>
                      <h4 className="section-strength">✅ Strengths</h4>
                      <ul className="box-list strength">
                        {report.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {report.missingSkills && (
                    <>
                      <h4 className="section-warning">⚠️ Missing Skills</h4>
                      <ul className="box-list warning">
                        {report.missingSkills.map((skill, i) => (
                          <li key={i}>{skill}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {report.suggestions && (
                    <>
                      <h4 className="section-suggestion">💡 Suggestions</h4>
                      <ul className="box-list suggestion">
                        {report.suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {report.bulletPointImprovements && (
                    <>
                      <h4 className="section-bullet">✍️ Improved Bullet Points</h4>
                      <ul className="box-list bullet">
                        {report.bulletPointImprovements.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <button onClick={handleDownloadPDF} className="download-pdf-btn">
                    ⬇ Download Report as PDF
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default YourResumes;