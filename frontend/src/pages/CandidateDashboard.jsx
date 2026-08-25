import { useEffect, useState } from "react";
import "./CandidateDashboard.css";

function CandidateDashboard() {
    /* =========================================================
       STATE
    ========================================================= */

    const [user, setUser] = useState(null);

    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [error, setError] = useState("");

    const [selectedJob, setSelectedJob] = useState(null);

    const [cv, setCv] = useState(null);
    const [candidateProfile, setCandidateProfile] = useState(null);

    const [uploadingCV, setUploadingCV] = useState(false);
    const [applying, setApplying] = useState(false);

    const [applicationMessage, setApplicationMessage] =
        useState("");

    const [applications, setApplications] = useState([]);

    const [phone, setPhone] = useState("");
    const [linkedin, setLinkedin] = useState("");

    const [activeSection, setActiveSection] =
        useState("opportunities");

    const [darkMode, setDarkMode] = useState(() => {
        const savedTheme =
            localStorage.getItem("candidate_theme");

        return savedTheme === "dark";
    });

    const API_URL = "http://127.0.0.1:8001/api";


    /* =========================================================
       INITIAL LOAD
    ========================================================= */

    useEffect(() => {
        const storedUser =
            localStorage.getItem("candidate_user");

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


    /* =========================================================
       DARK / LIGHT MODE
    ========================================================= */

    useEffect(() => {
        localStorage.setItem(
            "candidate_theme",
            darkMode ? "dark" : "light"
        );
    }, [darkMode]);


    /* =========================================================
       FETCH JOB VACANCIES
    ========================================================= */

    const fetchJobs = async () => {
        setLoadingJobs(true);
        setError("");

        try {
            const token =
                localStorage.getItem("auth_token");

            if (!token) {
                throw new Error(
                    "You are not authenticated. Please log in again."
                );
            }

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

            const jobData = Array.isArray(data)
                ? data
                : Array.isArray(data.data)
                ? data.data
                : [];

            setJobs(jobData);
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


    /* =========================================================
       LOGOUT
    ========================================================= */

    const handleLogout = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("candidate_user");

        window.location.href =
            "/candidate-login";
    };


    /* =========================================================
       NAVIGATION
    ========================================================= */

    const handleNavigation = (section) => {
        setActiveSection(section);

        setSelectedJob(null);
        setApplicationMessage("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };


    /* =========================================================
       VIEW JOB DETAILS
    ========================================================= */

    const handleViewJob = (job) => {
        setApplicationMessage("");
        setSelectedJob(job);
    };


    const handleCloseJob = () => {
        setSelectedJob(null);
        setApplicationMessage("");
    };


    /* =========================================================
       FETCH CANDIDATE CV
    ========================================================= */

    const fetchCandidateCV = async () => {
        try {
            const token =
                localStorage.getItem("auth_token");

            if (!token) return;

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

            const cvs = Array.isArray(data.cvs)
                ? data.cvs
                : [];

            if (cvs.length > 0) {
                setCv(cvs[0]);
            } else {
                setCv(null);
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


    /* =========================================================
       FETCH APPLICATIONS
    ========================================================= */

    const fetchApplications = async () => {
        try {
            const token =
                localStorage.getItem("auth_token");

            if (!token) {
                setApplications([]);
                return;
            }

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

            let applicationData = [];

            if (Array.isArray(data)) {
                applicationData = data;
            } else if (
                Array.isArray(data.applications)
            ) {
                applicationData =
                    data.applications;
            } else if (
                Array.isArray(data.data)
            ) {
                applicationData = data.data;
            }

            setApplications(applicationData);
        } catch (error) {
            console.error(
                "Error loading applications:",
                error
            );

            setApplications([]);
        }
    };


    /* =========================================================
       GET JOB FOR APPLICATION
    ========================================================= */

    const getApplicationJob = (application) => {
        if (application?.job_position) {
            return application.job_position;
        }

        if (application?.jobPosition) {
            return application.jobPosition;
        }

        if (application?.job_position_id) {
            return jobs.find(
                (job) =>
                    Number(job.id) ===
                    Number(
                        application.job_position_id
                    )
            );
        }

        return null;
    };


    /* =========================================================
       APPLICATION STATUS
    ========================================================= */

    const applicationSteps = [
        {
            key: "new",
            label: "Application Submitted",
        },
        {
            key: "under_review",
            label: "Under Review",
        },
        {
            key: "shortlisted",
            label: "Shortlisted",
        },
        {
            key: "interview",
            label: "Interview",
        },
        {
            key: "final",
            label: "Final Decision",
        },
    ];


    const getStatusIndex = (status) => {
        if (!status) return 0;

        const normalized =
            String(status)
                .toLowerCase()
                .replace(/[\s-]+/g, "_");

        switch (normalized) {
            case "new":
            case "submitted":
            case "application_submitted":
                return 0;

            case "under_review":
            case "review":
                return 1;

            case "shortlisted":
                return 2;

            case "interview":
                return 3;

            case "final":
            case "final_decision":
            case "accepted":
            case "rejected":
                return 4;

            default:
                return 0;
        }
    };


    /* =========================================================
       FORMAT DATE
    ========================================================= */

    const formatApplicationDate = (date) => {
        if (!date) {
            return "Date unavailable";
        }

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Date unavailable";
        }

        return parsedDate.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        );
    };


    /* =========================================================
       CHECK WHETHER CANDIDATE ALREADY APPLIED
    ========================================================= */

    const hasAppliedToJob = (jobId) => {
        return applications.some(
            (application) =>
                Number(
                    application.job_position_id
                ) === Number(jobId)
        );
    };


    /* =========================================================
       UPLOAD / REPLACE CV
    ========================================================= */

    const handleCVSelect = async (event) => {
        const file =
            event.target.files?.[0];

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

        if (
            !phone &&
            !candidateProfile?.phone
        ) {
            setApplicationMessage(
                "Please enter your phone number before uploading your CV."
            );

            setActiveSection("profile");

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
                        Accept:
                            "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data =
                await response.json();

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


    /* =========================================================
       APPLY FOR JOB
    ========================================================= */

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

        if (
            hasAppliedToJob(
                selectedJob.id
            )
        ) {
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
                        Accept:
                            "application/json",
                        "Content-Type":
                            "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        candidate_id:
                            candidateProfile.id,

                        job_position_id:
                            selectedJob.id,

                        cv_id: cv.id,
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


    /* =========================================================
       PROFILE VIEW
    ========================================================= */

    const renderProfile = () => {
        return (
            <section className="candidate-page-section">

                <div className="candidate-page-heading">
                    <p>PROFILE</p>

                    <h1>My Profile</h1>

                    <span>
                        Manage your candidate profile
                        and uploaded CV.
                    </span>
                </div>


                {/* PROFILE CARD */}

                <div className="candidate-profile-card">

                    <div className="profile-info-item">
                        <span>Name</span>

                        <strong>
                            {user?.name ||
                                candidateProfile?.full_name ||
                                "Not available"}
                        </strong>
                    </div>


                    <div className="profile-info-item">
                        <span>Email</span>

                        <strong>
                            {user?.email ||
                                candidateProfile?.email ||
                                "Not available"}
                        </strong>
                    </div>


                    <div className="profile-info-item">
                        <span>Phone</span>

                        <input
                            type="text"
                            value={phone}
                            onChange={(e) =>
                                setPhone(
                                    e.target.value
                                )
                            }
                            placeholder="Enter phone number"
                            className="profile-input"
                        />
                    </div>


                    <div className="profile-info-item">
                        <span>LinkedIn</span>

                        <input
                            type="url"
                            value={linkedin}
                            onChange={(e) =>
                                setLinkedin(
                                    e.target.value
                                )
                            }
                            placeholder="LinkedIn profile URL"
                            className="profile-input"
                        />
                    </div>

                </div>


                {/* CV */}

                <div className="profile-subsection">

                    <div className="candidate-page-heading small">

                        <p>DOCUMENTS</p>

                        <h2>My CV</h2>

                    </div>


                    <div className="candidate-cv-card">

                        <div className="cv-file-icon">
                            PDF
                        </div>

                        <div className="cv-file-content">

                            <span>
                                Uploaded CV
                            </span>

                            <strong>
                                {cv?.file_name ||
                                    "No CV uploaded yet"}
                            </strong>

                            <p>
                                Your CV will be used
                                when applying for
                                vacancies.
                            </p>

                        </div>


                        <div className="cv-actions">

                            <button
                                type="button"
                                className="upload-cv-button"
                                disabled={
                                    uploadingCV
                                }
                                onClick={() =>
                                    document
                                        .getElementById(
                                            "profile-cv-upload"
                                        )
                                        ?.click()
                                }
                            >
                                {uploadingCV
                                    ? "Uploading..."
                                    : cv
                                    ? "Replace CV"
                                    : "Upload CV"}
                            </button>

                        </div>

                    </div>


                    <input
                        id="profile-cv-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{
                            display: "none",
                        }}
                        onChange={
                            handleCVSelect
                        }
                    />

                </div>


                {applicationMessage && (
                    <div className="application-message">
                        {applicationMessage}
                    </div>
                )}

            </section>
        );
    };


    /* =========================================================
       OPPORTUNITIES VIEW
    ========================================================= */

    const renderOpportunities = () => {
        return (
            <section className="candidate-page-section">

                <div className="candidate-page-heading">

                    <p>RECRUITMENT</p>

                    <h1>
                        Available Opportunities
                    </h1>

                    <span>
                        Explore vacancies currently
                        available and find the
                        right opportunity for you.
                    </span>

                </div>


                {loadingJobs && (
                    <div className="candidate-message">
                        Loading available
                        opportunities...
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

                                        <div >
                                            <span>
                                                OPEN POSITION
                                            </span>
                                        </div>


                                        <button
                                            className="candidate-details-button"
                                            onClick={() =>
                                                handleViewJob(
                                                    job
                                                )
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
        );
    };


    /* =========================================================
       APPLICATIONS VIEW
    ========================================================= */

    const renderApplications = () => {
        return (
            <section className="candidate-page-section">

                <div className="candidate-page-heading">

                    <p>
                        RECRUITMENT JOURNEY
                    </p>

                    <h1>
                        My Applications
                    </h1>

                    <span>
                        Track the progress of every
                        position you have applied for.
                    </span>

                </div>


                {applications.length === 0 ? (

                    <div className="candidate-empty-state">

                        <div className="empty-icon">
                            ✓
                        </div>

                        <h3>
                            No applications yet
                        </h3>

                        <p>
                            Your applications will
                            appear here once you apply
                            for a vacancy.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                handleNavigation(
                                    "opportunities"
                                )
                            }
                        >
                            Browse Opportunities
                        </button>

                    </div>

                ) : (

                    <div className="candidate-applications-grid">

                        {applications.map(
                            (application) => {

                                const applicationJob =
                                    getApplicationJob(
                                        application
                                    );

                                const currentStatus =
                                    getStatusIndex(
                                        application.status
                                    );

                                return (

                                    <div
                                        className="candidate-application-card"
                                        key={
                                            application.id
                                        }
                                    >

                                        <div className="candidate-application-header">

                                            <div>

                                                <span className="application-department">
                                                    {applicationJob?.department ||
                                                        "Department"}
                                                </span>

                                                <h3>
                                                    {applicationJob?.title ||
                                                        "Job Position"}
                                                </h3>

                                            </div>


                                            <span className="application-status-badge">
                                                {applicationSteps[
                                                    currentStatus
                                                ]?.label ||
                                                    "Application Submitted"}
                                            </span>

                                        </div>


                                        <div className="candidate-application-info">

                                            <div>

                                                <span>
                                                    Match Score
                                                </span>

                                                <strong>
                                                    {application.match_score !==
                                                        null &&
                                                    application.match_score !==
                                                        undefined
                                                        ? `${application.match_score}%`
                                                        : "Not evaluated"}
                                                </strong>

                                            </div>


                                            <div>

                                                <span>
                                                    Applied
                                                </span>

                                                <strong>
                                                    {formatApplicationDate(
                                                        application.applied_at ||
                                                            application.created_at
                                                    )}
                                                </strong>

                                            </div>

                                        </div>


                                        <div className="application-progress">

                                            {applicationSteps.map(
                                                (
                                                    step,
                                                    index
                                                ) => {

                                                    const completed =
                                                        index <=
                                                        currentStatus;

                                                    const active =
                                                        index ===
                                                        currentStatus;

                                                    return (

                                                        <div
                                                            className={`application-step ${
                                                                completed
                                                                    ? "completed"
                                                                    : ""
                                                            } ${
                                                                active
                                                                    ? "active"
                                                                    : ""
                                                            }`}
                                                            key={
                                                                step.key
                                                            }
                                                        >

                                                            <span className="application-step-circle">
                                                                {completed
                                                                    ? "✓"
                                                                    : ""}
                                                            </span>

                                                            <span className="application-step-label">
                                                                {
                                                                    step.label
                                                                }
                                                            </span>

                                                        </div>

                                                    );

                                                }
                                            )}

                                        </div>

                                    </div>

                                );

                            }
                        )}

                    </div>

                )}

            </section>
        );
    };


    /* =========================================================
       JOB DETAILS MODAL
    ========================================================= */

    const renderJobModal = () => {
        if (!selectedJob) {
            return null;
        }

        const alreadyApplied =
            hasAppliedToJob(
                selectedJob.id
            );

        return (

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
                        aria-label="Close"
                    >
                        ×
                    </button>


                    <div className="job-modal-header">

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

                    </div>


                    <div className="job-modal-content">

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


                        <div className="job-modal-section">

                            <h3>
                                Your CV
                            </h3>


                            {cv ? (

                                <div className="uploaded-cv-box">

                                    <div className="uploaded-cv-icon">
                                        PDF
                                    </div>

                                    <div>

                                        <p className="job-cv-name">
                                            {cv.file_name}
                                        </p>

                                        <span className="cv-status">
                                            CV uploaded
                                        </span>

                                    </div>

                                </div>

                            ) : (

                                <div className="no-cv-message">
                                    No CV uploaded yet.
                                </div>

                            )}


                            {!phone &&
                                !candidateProfile?.phone && (

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
                                disabled={
                                    uploadingCV
                                }
                                onClick={() =>
                                    document
                                        .getElementById(
                                            "candidate-cv-upload"
                                        )
                                        ?.click()
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
                                onChange={
                                    handleCVSelect
                                }
                            />

                        </div>


                        <button
                            className="apply-job-button"
                            type="button"
                            onClick={handleApply}
                            disabled={
                                applying ||
                                !cv ||
                                alreadyApplied
                            }
                        >

                            {applying
                                ? "Applying..."
                                : alreadyApplied
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

            </div>

        );
    };


    /* =========================================================
       MAIN RENDER
    ========================================================= */

    return (

        <div
            className={`candidate-dashboard ${
                darkMode
                    ? "theme-dark"
                    : "theme-light"
            }`}
        >

            {/* =================================================
               SIDEBAR
            ================================================= */}

            <aside className="candidate-sidebar">

                <div className="candidate-brand">

                    <div className="brand-mark">
                        A
                    </div>

                    <span>
                        Altrium MG
                    </span>

                </div>


                <div className="sidebar-section">

                    <p className="sidebar-label">
                        HOME
                    </p>


                    <button
                        className={`sidebar-item ${
                            activeSection ===
                            "profile"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            handleNavigation(
                                "profile"
                            )
                        }
                    >

                        <span className="sidebar-icon">
                            ◇
                        </span>

                        <span>
                            My Profile
                        </span>

                    </button>


                    <button
                        className={`sidebar-item ${
                            activeSection ===
                            "opportunities"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            handleNavigation(
                                "opportunities"
                            )
                        }
                    >

                        <span className="sidebar-icon">
                            ◇
                        </span>

                        <span>
                            Available Opportunities
                        </span>

                    </button>


                    <button
                        className={`sidebar-item ${
                            activeSection ===
                            "applications"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            handleNavigation(
                                "applications"
                            )
                        }
                    >

                        <span className="sidebar-icon">
                            ◇
                        </span>

                        <span>
                            My Applications
                        </span>

                    </button>

                </div>


                <div className="sidebar-divider" />


                <div className="sidebar-section">

                    <p className="sidebar-label">
                        ACCOUNT
                    </p>


                    <button
                        className="sidebar-item logout-sidebar"
                        onClick={
                            handleLogout
                        }
                    >

                        <span className="sidebar-icon">
                            ↪
                        </span>

                        <span>
                            Logout
                        </span>

                    </button>

                </div>


                <div className="sidebar-footer">

                    <div className="sidebar-user">

                        <div className="sidebar-avatar">
                            {user?.name
                                ?.charAt(0)
                                ?.toUpperCase() ||
                                "C"}
                        </div>

                        <div>

                            <strong>
                                {user?.name ||
                                    "Candidate"}
                            </strong>

                            <span>
                                Candidate
                            </span>

                        </div>

                    </div>

                </div>

            </aside>


            {/* =================================================
               MAIN AREA
            ================================================= */}

            <main className="candidate-main">

                {/* TOP BAR */}

                <header className="candidate-topbar">

                    <div className="candidate-breadcrumb">

                        <span>
                            Candidate Portal
                        </span>

                        <span className="breadcrumb-divider">
                            /
                        </span>

                        <strong>
                            {activeSection ===
                                "profile"
                                ? "My Profile"
                                : activeSection ===
                                  "applications"
                                ? "My Applications"
                                : "Available Opportunities"}
                        </strong>

                    </div>


                    <div className="candidate-topbar-actions">

                        <button
                            className="theme-toggle"
                            onClick={() =>
                                setDarkMode(
                                    !darkMode
                                )
                            }
                            aria-label="Toggle theme"
                        >

                            <span>
                                {darkMode
                                    ? "☀"
                                    : "☾"}
                            </span>

                            <span>
                                {darkMode
                                    ? "Light"
                                    : "Dark"}
                            </span>

                        </button>

                    </div>

                </header>


                {/* PAGE HEADER */}

                <div className="candidate-welcome">

                    <div>

                        <p className="candidate-eyebrow">
                            CANDIDATE PORTAL
                        </p>

                        <h1>
                            Welcome back,{" "}
                            {user?.name ||
                                "Candidate"}
                        </h1>

                    </div>

                </div>


                {/* PAGE CONTENT */}

                <div className="candidate-content">

                    {activeSection ===
                        "profile" &&
                        renderProfile()}

                    {activeSection ===
                        "opportunities" &&
                        renderOpportunities()}

                    {activeSection ===
                        "applications" &&
                        renderApplications()}

                </div>

            </main>


            {/* JOB MODAL */}

            {renderJobModal()}

        </div>
    );
}

export default CandidateDashboard;