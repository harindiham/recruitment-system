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

    /*
    =========================================================
    INITIAL LOAD
    =========================================================
    */

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

    /*
    =========================================================
    FETCH JOB VACANCIES
    =========================================================
    */

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

    /*
    =========================================================
    LOGOUT
    =========================================================
    */

    const handleLogout = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("candidate_user");

        window.location.href = `${import.meta.env.BASE_URL}candidate-login`;
    };

    /*
    =========================================================
    VIEW JOB DETAILS
    =========================================================
    */

    const handleViewJob = (job) => {
        setApplicationMessage("");
        setSelectedJob(job);
    };

    const handleCloseJob = () => {
        setSelectedJob(null);
        setApplicationMessage("");
    };

    /*
    =========================================================
    FETCH CANDIDATE CV
    =========================================================
    */

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

    /*
    =========================================================
    FETCH APPLICATIONS
    =========================================================
    */

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

            /*
             * Laravel can return:
             *
             * [
             *   {...},
             *   {...}
             * ]
             *
             * OR:
             *
             * {
             *   applications: [...]
             * }
             *
             * OR:
             *
             * {
             *   data: [...]
             * }
             */

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

    /*
    =========================================================
    GET JOB FOR APPLICATION
    =========================================================
    */

    const getApplicationJob = (application) => {
        /*
         * Laravel Eloquent may serialize the
         * relationship as job_position.
         */

        if (application?.job_position) {
            return application.job_position;
        }

        /*
         * Some responses may use jobPosition.
         */

        if (application?.jobPosition) {
            return application.jobPosition;
        }

        /*
         * If the relationship wasn't included,
         * find the job from the vacancies already loaded.
         */

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

    /*
    =========================================================
    APPLICATION STATUS
    =========================================================
    */

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

    /*
    =========================================================
    FORMAT DATE
    =========================================================
    */

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

    /*
    =========================================================
    CHECK WHETHER CANDIDATE ALREADY APPLIED
    =========================================================
    */

    const hasAppliedToJob = (jobId) => {
        return applications.some(
            (application) =>
                Number(
                    application.job_position_id
                ) === Number(jobId)
        );
    };

    /*
    =========================================================
    UPLOAD / REPLACE CV
    =========================================================
    */

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

    /*
    =========================================================
    APPLY FOR JOB
    =========================================================
    */

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

    /*
    =========================================================
    RENDER
    =========================================================
    */

    return (
        <div className="candidate-dashboard">

            {/* =========================================
                HEADER
            ========================================= */}

            <header className="candidate-dashboard-header">

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

                <button
                    className="candidate-logout-button"
                    onClick={handleLogout}
                >
                    Logout
                </button>

            </header>


            {/* =========================================
                PROFILE
            ========================================= */}

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


            {/* =========================================
                MY CV
            ========================================= */}

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


            {/* =========================================
                AVAILABLE OPPORTUNITIES
            ========================================= */}

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

                                        <div className="candidate-count">
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


            {/* =========================================
                MY APPLICATIONS
            ========================================= */}

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


                {applications.length === 0 ? (

                    <div className="candidate-message">
                        Your applications will appear
                        here.
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

                                        {/* HEADER */}

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


                                        {/* DETAILS */}

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


                                        {/* STATUS JOURNEY */}

                                        <div className="application-progress">

                                            {applicationSteps.map(
                                                (
                                                    step,
                                                    index
                                                ) => {

                                                    const completed =
                                                        index <=
                                                        currentStatus;

                                                    return (

                                                        <div
                                                            className={`application-step ${
                                                                completed
                                                                    ? "completed"
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


            {/* =========================================
                JOB DETAILS MODAL
            ========================================= */}

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

                        {/* CLOSE */}

                        <button
                            className="job-modal-close"
                            onClick={handleCloseJob}
                        >
                            ×
                        </button>


                        {/* DEPARTMENT */}

                        <p className="job-modal-department">
                            {selectedJob.department ||
                                "Department"}
                        </p>


                        {/* TITLE */}

                        <h2>
                            {selectedJob.title}
                        </h2>


                        {/* TAGS */}

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


                        {/* DESCRIPTION */}

                        <div className="job-modal-section">

                            <h3>
                                Description
                            </h3>

                            <p>
                                {selectedJob.description ||
                                    "No description provided."}
                            </p>

                        </div>


                        {/* RESPONSIBILITIES */}

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


                            {/* UPLOAD BUTTON */}

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


                        {/* APPLY BUTTON */}

                        <button
                            className="apply-job-button"
                            type="button"
                            onClick={handleApply}
                            disabled={
                                applying ||
                                !cv ||
                                hasAppliedToJob(
                                    selectedJob.id
                                )
                            }
                        >

                            {applying
                                ? "Applying..."
                                : hasAppliedToJob(
                                      selectedJob.id
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