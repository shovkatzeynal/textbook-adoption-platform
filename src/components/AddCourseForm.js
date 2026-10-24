import { apiUrl } from "../api";
import React, { useState } from "react";

const AddCourseForm = ({ colors, onCourseAdded }) => {
  const [courseData, setCourseData] = useState({ courseNumber: "", courseName: "", term: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem("token");

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!courseData.courseNumber || !courseData.courseName || !courseData.term) {
      alert("All fields are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(apiUrl("/api/add-course"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseNumber: courseData.courseNumber,
          courseName:   courseData.courseName,
          term:         courseData.term,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setCourseData({ courseNumber: "", courseName: "", term: "" });
        if (onCourseAdded) onCourseAdded();
      } else {
        alert(result.message || "Failed to add course.");
      }
    } catch (err) {
      console.error("Unable to reach the course service.");
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ background: colors.lightBlue, padding: "20px", borderRadius: "10px", marginBottom: "30px" }}>
      <h2 style={{ color: colors.darkText }}>Add a New Course</h2>
      <form onSubmit={handleAddCourse}>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <label>Course Number:</label>
            <input
              type="text"
              aria-label="Course Number"
              value={courseData.courseNumber}
              onChange={e => setCourseData({ ...courseData, courseNumber: e.target.value })}
              style={inputStyle(colors)}
            />
            <label>Course Name:</label>
            <input
              type="text"
              aria-label="Course Name"
              value={courseData.courseName}
              onChange={e => setCourseData({ ...courseData, courseName: e.target.value })}
              style={inputStyle(colors)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Term:</label>
            <input
              type="text"
              placeholder="e.g. Spring 2026"
              aria-label="Term"
              value={courseData.term}
              onChange={e => setCourseData({ ...courseData, term: e.target.value })}
              style={inputStyle(colors)}
            />
          </div>
        </div>
        <button type="submit" style={buttonStyle(colors)} disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "+ Add Course"}
        </button>
      </form>
    </div>
  );
};

const inputStyle = (colors) => ({
  width: "100%", marginBottom: "10px", padding: "10px",
  borderRadius: "5px", border: "1px solid #ccc",
  backgroundColor: "#fff", color: colors.darkText, fontSize: "15px",
});

const buttonStyle = (colors) => ({
  background: colors.steelBlue, color: "#fff", padding: "10px 20px",
  border: "none", borderRadius: "5px", cursor: "pointer",
  fontWeight: "bold", marginTop: "10px",
});

export default AddCourseForm;
