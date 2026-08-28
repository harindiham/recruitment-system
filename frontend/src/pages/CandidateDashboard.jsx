import { useEffect, useState } from "react";
import "./CandidateDashboard.css";

function CandidateDashboard() {
    const [user, setUser] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [error, setError] = useState("");
    const [selectedJob, setSelectedJob] = useState(null);

    const [cv, setCv] = useState(null);
    const [candidateProfile, setCandidateProfile] = useState(null);
    const [uploadingCV, setUploadingCV] = useState(false);
    const [applying, setApplying] = useState(false);
    const [applicationMessage, setApplicationMessage] = useState("");
    const [applications, setApplications] = useState([]);

    const [phone, setPhone] = useState("");
    const [linkedin, setLinkedin] = useState("");

    const API_URL = "http://127.0.0.1:8001/api";

    useEffect(() => {
        const storedUser = localStorage.getItem("candidate_user");

        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error(
                    "Error reading candidate user:",
                    error
                );
            }
        }

        fetchJobs();
        fetchCandidateCV();
        fetchApplications();
    }, []);

    // =========================================
    // FETCH JOB VACANCIES
    // =========================================

    const fetchJobs = async () => {
        setLoadingJobs(true);
        setError("");

        try {
            const token =
                localStorage.getItem("auth_token");

            const response = await fetch(
                `${API_URL}/job-positions`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to load job vacancies."
                );
            }

            setJobs(
                Array.isArray(data)
                    ? data
                    : data.data || []
            );

        } catch (error) {
            console.error(
                "Error loading jobs:",
                error
            );

            setError(
                error.message ||
                "Unable to load job vacancies."
            );

        } finally {
            setLoadingJobs(false);
        }
    };

    // =========================================
    // LOGOUT
    // =========================================

    const handleLogout = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("candidate_user");

        window.location.href =
            "/recruitment-system/candidate-login";
    };

    // =========================================
    // VIEW JOB DETAILS
    // =========================================

    const handleViewJob = (job) => {
        setSelectedJob(job);
    };

    // =========================================
    // CLOSE JOB DETAILS
    // =========================================

    const handleCloseJob = () => {
        setSelectedJob(null);
    };

    // =========================================
    // FETCH CANDIDATE CV
    // =========================================

    const fetchCandidateCV = async () => {
        try {
            const token =
                localStorage.getItem("auth_token");

            const response = await fetch(
                `${API_URL}/cvs`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to load CV information."
                );
            }

            setCandidateProfile(
                data.candidate || null
            );

            const cvs = data.cvs || [];

            if (cvs.length > 0) {
                setCv(cvs[0]);
            }

            setPhone(
                data.candidate?.phone || ""
            );

            setLinkedin(
                data.candidate?.linkedin || ""
            );

        } catch (error) {
            console.error(
                "Error loading candidate CV:",
                error
            );
        }
    };

    // =========================================
    // FETCH APPLICATIONS
    // =========================================

    const fetchApplications = async () => {
        try {
            const token =
                localStorage.getItem("auth_token");

            const response = await fetch(
                `${API_URL}/applications`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to load applications."
                );
            }

            setApplications(
                Array.isArray(data)
                    ? data
                    : data.applications || []
            );

        } catch (error) {
            console.error(
                "Application loading error:",
                error
            );

            setApplications([]);
        }
    };

    // =========================================
    // UPLOAD / REPLACE CV
    // =========================================

    const handleCVSelect = async (event) => {
        const file = event.target.files[0];

        if (!file) return;

        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];

        if (!allowedTypes.includes(file.type)) {
            setApplicationMessage(
                "Please upload a PDF, DOC, or DOCX file."
            );

            event.target.value = "";
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setApplicationMessage(
                "The CV must be smaller than 10MB."
            );

            event.target.value = "";
            return;
        }

        if (!user?.name || !user?.email) {
            setApplicationMessage(
                "Your candidate name or email is missing. Please log in again."
            );

            event.target.value = "";
            return;
        }

        if (!phone && !candidateProfile?.phone) {
            setApplicationMessage(
                "Please enter your phone number before uploading your CV."
            );

            event.target.value = "";
            return;
        }

        setUploadingCV(true);
        setApplicationMessage("");

        try {
            const token =
                localStorage.getItem("auth_token");

            const formData = new FormData();

            formData.append(
                "full_name",
                user.name
            );

            formData.append(
                "email",
                user.email
            );

            formData.append(
                "phone",
                phone ||
                candidateProfile?.phone ||
                ""
            );

            formData.append(
                "linkedin",
                linkedin ||
                candidateProfile?.linkedin ||
                ""
            );

            formData.append("cv", file);

            const response = await fetch(
                `${API_URL}/cvs`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "CV upload failed."
                );
            }

            setCv(data.cv || null);

            setCandidateProfile(
                data.candidate ||
                candidateProfile
            );

            setApplicationMessage(
                `CV uploaded successfully: ${
                    data.cv?.file_name ||
                    file.name
                }`
            );

            await fetchCandidateCV();

        } catch (error) {
            console.error(
                "CV upload error:",
                error
            );

            setApplicationMessage(
                error.message ||
                "Unable to upload CV."
            );

        } finally {
            setUploadingCV(false);
            event.target.value = "";
        }
    };

    // =========================================
    // APPLY FOR JOB
    // =========================================

    const handleApply = async () => {
        if (!selectedJob) return;

        if (!cv) {
            setApplicationMessage(
                "Please upload your CV before applying."
            );
            return;
        }

        if (!candidateProfile?.id) {
            setApplicationMessage(
                "Candidate profile could not be found."
            );
            return;
        }

        const alreadyApplied =
            applications.some(
                (application) =>
                    Number(
                        application.job_position_id
                    ) ===
                    Number(selectedJob.id)
            );

        if (alreadyApplied) {
            setApplicationMessage(
                "You have already applied for this vacancy."
            );
            return;
        }

        setApplying(true);
        setApplicationMessage("");

        try {
            const token =
                localStorage.getItem("auth_token");

            const response = await fetch(
                `${API_URL}/applications`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        candidate_id:
                            candidateProfile.id,
                        job_position_id:
                            selectedJob.id,
                        cv_id:
                            cv.id,
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to submit application."
                );
            }

            setApplicationMessage(
                "Application submitted successfully."
            );

            await fetchApplications();

        } catch (error) {
            console.error(
                "Application error:",
                error
            );

            setApplicationMessage(
                error.message ||
                "Unable to submit application."
            );

        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="candidate-dashboard">

            <header className="candidate-dashboard-header">

                <div>
                    <p className="candidate-eyebrow">
                        CANDIDATE PORTAL
                    </p>

                    <h1>
                        Welcome back,{" "}
                        {user?.name || "Candidate"}
                    </h1>
                </div>

                <button
                    className="candidate-logout-button"
                    onClick={handleLogout}
                >
                    Logout
                </button>

            </header>

            {/* PROFILE */}

            <section className="candidate-section">

                <div className="candidate-section-heading">
                    <p>PROFILE</p>
                    <h2>My Profile</h2>
                </div>

                <div className="candidate-profile-card">

                    <div>
                        <span>Name</span>

                        <strong>
                            {user?.name ||
                                "Not available"}
                        </strong>
                    </div>

                    <div>
                        <span>Email</span>

                        <strong>
                            {user?.email ||
                                "Not available"}
                        </strong>
                    </div>

                </div>

            </section>

            {/* MY CV */}

            <section className="candidate-section">

                <div className="candidate-section-heading">
                    <p>DOCUMENTS</p>
                    <h2>My CV</h2>
                </div>

                <div className="candidate-cv-card">

                    <div>
                        <span>
                            Uploaded CV
                        </span>

                        <strong>
                            {cv?.file_name ||
                                "No CV uploaded"}
                        </strong>
                    </div>

                    <p>
                        Your CV will be used when
                        applying for vacancies.
                    </p>

                </div>

            </section>

            {/* AVAILABLE OPPORTUNITIES */}

            <section className="candidate-section">

                <div className="candidate-section-heading">

                    <p>RECRUITMENT</p>

                    <h2>
                        Available Opportunities
                    </h2>

                    <span>
                        Explore vacancies currently
                        available and find the right
                        opportunity for you.
                    </span>

                </div>

                {loadingJobs && (
                    <div className="candidate-message">
                        Loading available opportunities...
                    </div>
                )}

                {!loadingJobs && error && (
                    <div className="candidate-error">
                        {error}
                    </div>
                )}

                {!loadingJobs &&
                    !error &&
                    jobs.length === 0 && (
                        <div className="candidate-message">
                            No job vacancies are
                            currently available.
                        </div>
                    )}

                {!loadingJobs &&
                    !error &&
                    jobs.length > 0 && (

                        <div className="candidate-job-grid">

                            {jobs.map((job) => (

                                <div
                                    className="candidate-job-card"
                                    key={job.id}
                                >

                                    <div className="candidate-job-card-top">

                                        <span className="job-status">
                                            {job.status ||
                                                "Open"}
                                        </span>

                                        <span className="job-status-dot">
                                            ●
                                        </span>

                                    </div>

                                    <div className="candidate-job-content">

                                        <p className="job-company">
                                            Altrium
                                        </p>

                                        <h3>
                                            {job.title}
                                        </h3>

                                        <div className="job-tags">

                                            <span>
                                                {job.employment_type ||
                                                    "Not specified"}
                                            </span>

                                            <span>
                                                {job.department ||
                                                    "Department not specified"}
                                            </span>

                                            <span>
                                                {job.minimum_experience !==
                                                    null &&
                                                job.minimum_experience !==
                                                    undefined
                                                    ? `${job.minimum_experience}+ years`
                                                    : "Experience not specified"}
                                            </span>

                                        </div>

                                    </div>

                                    <div className="candidate-job-card-bottom">

                                        <span>
                                            OPEN POSITION
                                        </span>

                                        <button
                                            className="candidate-details-button"
                                            onClick={() =>
                                                handleViewJob(job)
                                            }
                                        >
                                            View Details →
                                        </button>

                                    </div>

                                </div>

                            ))}

                        </div>

                    )}

            </section>

            {/* MY APPLICATIONS */}

            <section className="candidate-section">

                <div className="candidate-section-heading">

                    <p>
                        RECRUITMENT JOURNEY
                    </p>

                    <h2>
                        My Applications
                    </h2>

                    <span>
                        Track the progress of every
                        position you have applied for.
                    </span>

                </div>

                <div className="candidate-message">
                    Your applications will appear here.
                </div>

            </section>

            {/* JOB DETAILS MODAL */}

            {selectedJob && (

                <div
                    className="job-modal-overlay"
                    onClick={handleCloseJob}
                >

                    <div
                        className="job-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        <button
                            className="job-modal-close"
                            onClick={handleCloseJob}
                        >
                            ×
                        </button>

                        <p className="job-modal-department">
                            {selectedJob.department ||
                                "Department"}
                        </p>

                        <h2>
                            {selectedJob.title}
                        </h2>

                        <div className="job-modal-tags">

                            <span>
                                {selectedJob.employment_type ||
                                    "Not specified"}
                            </span>

                            <span>
                                {selectedJob.minimum_experience !==
                                    null &&
                                selectedJob.minimum_experience !==
                                    undefined
                                    ? `${selectedJob.minimum_experience}+ years experience`
                                    : "Experience not specified"}
                            </span>

                        </div>

                        <div className="job-modal-section">

                            <h3>
                                Description
                            </h3>

                            <p>
                                {selectedJob.description ||
                                    "No description provided."}
                            </p>

                        </div>

                        <div className="job-modal-section">

                            <h3>
                                Responsibilities
                            </h3>

                            <p>
                                {selectedJob.responsibilities ||
                                    "No responsibilities provided."}
                            </p>

                        </div>

                        {/* CV */}

                        <div className="job-modal-section">

                            <h3>
                                Your CV
                            </h3>

                            {cv ? (

                                <div className="uploaded-cv-box">

                                    <p className="job-cv-name">
                                        {cv.file_name}
                                    </p>

                                    <span className="cv-status">
                                        CV uploaded
                                    </span>

                                </div>

                            ) : (

                                <p className="job-cv-name">
                                    No CV uploaded yet.
                                </p>

                            )}

                            {/* CONTACT INFORMATION */}
                            {/* THIS IS THE FIX */}

                            {!candidateProfile?.phone && (

                                <div className="candidate-contact-fields">

                                    <label>
                                        Phone Number
                                    </label>

                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) =>
                                            setPhone(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter your phone number"
                                        className="candidate-modal-input"
                                    />

                                    <label>
                                        LinkedIn URL
                                    </label>

                                    <input
                                        type="url"
                                        value={linkedin}
                                        onChange={(e) =>
                                            setLinkedin(
                                                e.target.value
                                            )
                                        }
                                        placeholder="https://linkedin.com/in/your-name"
                                        className="candidate-modal-input"
                                    />

                                </div>

                            )}

                            <button
                                className="upload-cv-button"
                                type="button"
                                disabled={uploadingCV}
                                onClick={() =>
                                    document
                                        .getElementById(
                                            "candidate-cv-upload"
                                        )
                                        .click()
                                }
                            >

                                {uploadingCV
                                    ? "Uploading..."
                                    : cv
                                    ? "Replace CV"
                                    : "Upload CV"}

                            </button>

                            <input
                                id="candidate-cv-upload"
                                type="file"
                                accept=".pdf,.doc,.docx"
                                style={{
                                    display: "none",
                                }}
                                onChange={handleCVSelect}
                            />

                        </div>

                        {/* APPLY */}

                        <button
                            className="apply-job-button"
                            type="button"
                            onClick={handleApply}
                            disabled={
                                applying ||
                                !cv ||
                                applications.some(
                                    (application) =>
                                        Number(
                                            application.job_position_id
                                        ) ===
                                        Number(
                                            selectedJob.id
                                        )
                                )
                            }
                        >

                            {applying
                                ? "Applying..."
                                : applications.some(
                                      (application) =>
                                          Number(
                                              application.job_position_id
                                          ) ===
                                          Number(
                                              selectedJob.id
                                          )
                                  )
                                ? "Already Applied"
                                : !cv
                                ? "Upload CV to Apply"
                                : "Apply for this job"}

                        </button>

                        {applicationMessage && (

                            <div className="application-message">
                                {applicationMessage}
                            </div>

                        )}

                    </div>

                </div>

            )}

        </div>
    );
}

export default CandidateDashboard;