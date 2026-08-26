import { useEffect, useMemo, useState } from "react";
import "./HRDashboard.css";

const API_URL = import.meta.env.VITE_API_URL;
const STORAGE_URL = `${import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")}/storage`;

function HRDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    // =========================================================
    // THEME
    // =========================================================

    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("hr-theme") === "dark";
    });

    useEffect(() => {
        localStorage.setItem(
            "hr-theme",
            darkMode ? "dark" : "light"
        );
    }, [darkMode]);

    // =========================================================
    // STATE
    // =========================================================

    const [vacancies, setVacancies] = useState([]);
    const [applications, setApplications] = useState([]);

    const [loading, setLoading] = useState(true);
    const [applicationsLoading, setApplicationsLoading] =
        useState(true);

    const [detailsLoading, setDetailsLoading] = useState(false);

    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");

    const [showCreateVacancy, setShowCreateVacancy] =
        useState(false);

    const [selectedVacancy, setSelectedVacancy] =
        useState(null);

    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    // Candidate management
    const [selectedCandidate, setSelectedCandidate] =
        useState(null);

    const [candidateLoading, setCandidateLoading] =
        useState(false);

    const [statusUpdating, setStatusUpdating] =
        useState(false);

    // CV extracted text toggle
    const [showExtractedText, setShowExtractedText] =
        useState(false);

    const [newVacancy, setNewVacancy] = useState({
        title: "",
        department: "Human Resources",
        description: "",
        responsibilities: "",
        minimum_experience: 0,
        employment_type: "Full time",
        status: "open",
    });

    // =========================================================
    // FETCH VACANCIES
    // =========================================================

    useEffect(() => {
        fetchVacancies();
    }, []);

    useEffect(() => {
        if (token) {
            fetchApplications();
        }
    }, [token]);

    const fetchVacancies = async () => {
        try {
            setLoading(true);
            setError("");

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
                        "Failed to load vacancies."
                );
            }

            const jobs =
                Array.isArray(data)
                    ? data
                    : data.jobs ||
                      data.data ||
                      data.job_positions ||
                      [];

            setVacancies(jobs);
        } catch (error) {
            console.error(error);

            setError(
                error.message ||
                    "Unable to load vacancies."
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // FETCH APPLICATIONS
    // =========================================================

    const fetchApplications = async () => {
        try {
            setApplicationsLoading(true);

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

            console.log(
                "APPLICATION API RESPONSE:",
                data
            );

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        `Failed to load applications. Status: ${response.status}`
                );
            }

            let applicationList = [];

            if (Array.isArray(data)) {
                applicationList = data;
            } else if (
                Array.isArray(data.applications)
            ) {
                applicationList = data.applications;
            } else if (
                Array.isArray(data.data)
            ) {
                applicationList = data.data;
            }

            console.log(
                "APPLICATIONS LOADED:",
                applicationList
            );

            setApplications(applicationList);
        } catch (error) {
            console.error(
                "APPLICATION LOADING ERROR:",
                error
            );

            setError(
                `Could not load applications: ${error.message}`
            );

            setApplications([]);
        } finally {
            setApplicationsLoading(false);
        }
    };

    // =========================================================
    // GET CANDIDATE COUNT FOR A VACANCY
    // =========================================================

    const getCandidateCount = (jobPositionId) => {
        return applications.filter(
            (application) =>
                Number(application.job_position_id) ===
                Number(jobPositionId)
        ).length;
    };

    // =========================================================
    // ADD CANDIDATE COUNTS TO VACANCIES
    // =========================================================

    const vacanciesWithCounts = useMemo(() => {
        return vacancies.map((vacancy) => ({
            ...vacancy,

            candidates_count:
                getCandidateCount(vacancy.id),
        }));
    }, [vacancies, applications]);

    // =========================================================
    // SEARCH
    // =========================================================

    const filteredVacancies = useMemo(() => {
        const search = searchTerm
            .trim()
            .toLowerCase();

        if (!search) {
            return vacanciesWithCounts;
        }

        return vacanciesWithCounts.filter(
            (vacancy) =>
                vacancy.title
                    ?.toLowerCase()
                    .includes(search) ||
                vacancy.department
                    ?.toLowerCase()
                    .includes(search) ||
                vacancy.employment_type
                    ?.toLowerCase()
                    .includes(search)
        );
    }, [vacanciesWithCounts, searchTerm]);

    // =========================================================
    // SUMMARY
    // =========================================================

    const openVacancies = vacancies.filter(
        (vacancy) =>
            String(vacancy.status || "open")
                .toLowerCase() === "open"
    ).length;

    const totalCandidates = applications.length;

    const shortlistedCandidates = applications.filter(
        (application) =>
            application.status === "shortlisted"
    ).length;

    // =========================================================
    // CV STATISTICS
    // =========================================================

    const getCvStats = (cv) => {
        if (!cv) {
            return {
                experience: "Not available",
                skills: "Not available",
                education: "Not available",
                certifications: "Not available",
                languages: "Not available",
            };
        }

        const text = cv.extracted_text || "";

        // EXPERIENCE

        const experienceMatch = text.match(
            /(\d+)\+?\s*years?\s*(?:of\s*)?experience/i
        );

        const experience = experienceMatch
            ? `${experienceMatch[1]}+ years`
            : "Not specified";

        // SKILLS

        let skills = "Not specified";

        const skillsMatch = text.match(
            /CORE SKILLS\s*([\s\S]*?)(?:PROFESSIONAL EXPERIENCE|EXPERIENCE|EDUCATION)/i
        );

        if (skillsMatch) {
            const skillText = skillsMatch[1]
                .replace(/\n/g, " ")
                .trim();

            const skillList = skillText
                .split(/\s{2,}|(?=[A-Z][a-z])/)
                .map((skill) => skill.trim())
                .filter(Boolean);

            if (skillList.length > 0) {
                skills =
                    skillList.length >= 9
                        ? "9+ core skills"
                        : `${skillList.length} core skills`;
            }
        }

        // EDUCATION

        let education = "Not specified";

        const educationMatch = text.match(
            /EDUCATION\s*([\s\S]*?)(?:CERTIFICATIONS|ADDITIONAL INFORMATION|PROFESSIONAL EXPERIENCE|$)/i
        );

        if (educationMatch) {
            const educationText = educationMatch[1]
                .replace(/\n/g, " ")
                .trim();

            if (educationText) {
                if (
                    educationText
                        .toLowerCase()
                        .includes("human resource")
                ) {
                    education =
                        "BBA — HR Management";
                } else {
                    education =
                        educationText.length > 35
                            ? educationText.substring(0, 35) +
                              "..."
                            : educationText;
                }
            }
        }

        // CERTIFICATIONS

        let certifications = "Not specified";

        const certificationMatch = text.match(
            /CERTIFICATIONS\s*([\s\S]*?)(?:ADDITIONAL INFORMATION|$)/i
        );

        if (certificationMatch) {
            const certificationText =
                certificationMatch[1];

            const certificationLines =
                certificationText
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(
                        (line) =>
                            line &&
                            !line.match(/^[-•]/)
                    );

            const bulletCount =
                certificationText.match(/[-•]/g);

            const count =
                bulletCount?.length ||
                certificationLines.length;

            if (count > 0) {
                certifications =
                    `${count} certification${
                        count !== 1 ? "s" : ""
                    }`;
            }
        }

        // LANGUAGES

        let languages = "Not specified";

        const languageMatch = text.match(
            /Languages?:\s*(.+)/i
        );

        if (languageMatch) {
            languages = languageMatch[1]
                .split("\n")[0]
                .trim();

            if (languages.length > 35) {
                languages =
                    languages.substring(0, 35) +
                    "...";
            }
        }

        return {
            experience,
            skills,
            education,
            certifications,
            languages,
        };
    };

    // =========================================================
    // MATCHING STATISTICS
    // =========================================================

    const getMatchScore = (application) => {
        const score = Number(application?.match_score);

        if (!Number.isFinite(score)) {
            return null;
        }

        return Math.max(0, Math.min(100, score));
    };

    const getMatchCategory = (application) => {
        if (application?.category) {
            return application.category;
        }

        const score = getMatchScore(application);

        if (score === null) {
            return "Not evaluated";
        }

        if (score >= 80) return "Strong Match";
        if (score >= 60) return "Good Match";
        if (score >= 40) return "Possible Match";

        return "Weak Match";
    };

    // =========================================================
    // CREATE VACANCY
    // =========================================================

    const handleCreateVacancy = async (e) => {
        e.preventDefault();

        try {
            setError("");

            const response = await fetch(
                `${API_URL}/job-positions`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Accept:
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        title:
                            newVacancy.title,

                        department:
                            newVacancy.department,

                        description:
                            newVacancy.description,

                        responsibilities:
                            newVacancy.responsibilities,

                        minimum_experience:
                            Number(
                                newVacancy.minimum_experience
                            ),

                        employment_type:
                            newVacancy.employment_type,

                        status:
                            newVacancy.status,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to create vacancy."
                );
            }

            const createdJob =
                data.job ||
                data.data ||
                data.job_position ||
                data;

            setVacancies((currentVacancies) => [
                ...currentVacancies,
                createdJob,
            ]);

            setNewVacancy({
                title: "",
                department: "Human Resources",
                description: "",
                responsibilities: "",
                minimum_experience: 0,
                employment_type: "Full time",
                status: "open",
            });

            setShowCreateVacancy(false);

            await fetchVacancies();
        } catch (error) {
            console.error(error);

            setError(
                error.message ||
                    "Unable to create vacancy."
            );
        }
    };

    // =========================================================
    // VIEW VACANCY DETAILS
    // =========================================================

    const handleViewDetails = async (id) => {
        try {
            setDetailsLoading(true);
            setError("");
            setSelectedVacancy(null);

            const response = await fetch(
                `${API_URL}/job-positions/${id}`,
                {
                    method: "GET",

                    headers: {
                        Accept:
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Unable to load vacancy details."
                );
            }

            const vacancy =
                data.job ||
                data.job_position ||
                data.data ||
                data;

            setSelectedVacancy({
                ...vacancy,

                candidates_count:
                    getCandidateCount(id),
            });
        } catch (error) {
            console.error(error);

            setError(
                error.message ||
                    "Unable to load vacancy details."
            );
        } finally {
            setDetailsLoading(false);
        }
    };

    // =========================================================
    // VIEW CANDIDATES FOR A VACANCY
    // =========================================================

    const handleViewCandidates = async (vacancyId) => {
        try {
            setCandidateLoading(true);
            setError("");

            const response = await fetch(
                `${API_URL}/applications`,
                {
                    method: "GET",

                    headers: {
                        Accept:
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Unable to load candidates."
                );
            }

            const allApplications =
                Array.isArray(data)
                    ? data
                    : data.applications ||
                      data.data ||
                      [];

            /*
             * Filter candidates belonging to this vacancy
             * and automatically rank them by match score.
             *
             * Highest score = #1
             */

            const vacancyApplications =
                allApplications
                    .filter(
                        (application) =>
                            Number(
                                application.job_position_id
                            ) === Number(vacancyId)
                    )
                    .sort((a, b) => {
                        const scoreA =
                            Number(
                                a.match_score ?? 0
                            );

                        const scoreB =
                            Number(
                                b.match_score ?? 0
                            );

                        return scoreB - scoreA;
                    });

            setSelectedCandidate({
                vacancyId,
                applications:
                    vacancyApplications,
            });

            // Start with extracted text hidden
            setShowExtractedText(false);
        } catch (error) {
            console.error(error);

            setError(
                error.message ||
                    "Unable to load candidates."
            );
        } finally {
            setCandidateLoading(false);
        }
    };

    // =========================================================
    // UPDATE APPLICATION STATUS
    // =========================================================

    const deleteVacancy = async (vacancyId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this vacancy?\n\nThis action cannot be undone."
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            const response = await fetch(
                `${API_URL}/job-positions/${vacancyId}`,
                {
                    method: "DELETE",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to delete vacancy."
                );
            }

            setVacancies((currentVacancies) =>
                currentVacancies.filter(
                    (vacancy) =>
                        Number(vacancy.id) !==
                        Number(vacancyId)
                )
            );

            setApplications((currentApplications) =>
                currentApplications.filter(
                    (application) =>
                        Number(
                            application.job_position_id
                        ) !== Number(vacancyId)
                )
            );

            setSelectedVacancy(null);

            console.log(
                "Vacancy deleted successfully."
            );
        } catch (error) {
            console.error(
                "DELETE VACANCY ERROR:",
                error
            );

            setError(
                error.message ||
                    "Something went wrong while deleting the vacancy."
            );
        }
    };

    const handleStatusChange = async (
        applicationId,
        newStatus
    ) => {
        try {
            setStatusUpdating(true);
            setError("");

            const response = await fetch(
                `${API_URL}/applications/${applicationId}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Accept:
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        status: newStatus,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Unable to update application status."
                );
            }

            // Update candidate modal immediately

            setSelectedCandidate((current) => {
                if (!current) return current;

                return {
                    ...current,

                    applications:
                        current.applications.map(
                            (application) =>
                                application.id ===
                                applicationId
                                    ? {
                                          ...application,
                                          status:
                                              newStatus,
                                      }
                                    : application
                        ),
                };
            });

            await fetchApplications();
        } catch (error) {
            console.error(error);

            setError(
                error.message ||
                    "Unable to update application status."
            );
        } finally {
            setStatusUpdating(false);
        }
    };

    // =========================================================
    // LOGOUT
    // =========================================================

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "/";
    };

    // =========================================================
    // REFRESH
    // =========================================================

    const handleRefresh = async () => {
        await Promise.all([
            fetchVacancies(),
            fetchApplications(),
        ]);
    };

    // =========================================================
    // DASHBOARD
    // =========================================================

    return (
        <div
            className={`dashboard ${
                darkMode
                    ? "dark-mode"
                    : "light-mode"
            }`}
        >
            {/* =================================================
                SIDEBAR
            ================================================= */}

            <aside className="sidebar">

                <div className="company">

                    <div className="company-logo"></div>

                    <span>
                        Altrium MG
                    </span>

                    <span className="dropdown">
                        ⌄
                    </span>

                </div>

                <div className="sidebar-menu">

                    <div className="menu-title">
                        Home
                    </div>

                    <div className="menu-item">
                        <span>▣</span>
                        Inbox
                    </div>

                    <div className="menu-item">
                        <span>▤</span>
                        Feedbacks
                    </div>

                    <div className="menu-item active">
                        <span>◇</span>
                        Recruitment Details
                    </div>

                    <div className="menu-item">
                        <span>♧</span>
                        Meetings
                    </div>

                    <div className="menu-item">
                        <span>◉</span>
                        My Tasks
                    </div>

                    <div className="menu-item">
                        <span>⌁</span>
                        All Tasks
                    </div>

                    <div className="menu-item">
                        <span>•••</span>
                        More
                    </div>

                    <hr />

                    <div className="section-title">
                        Recruitment
                    </div>

                    <div className="menu-item">
                        <span>＋</span>
                        Candidates
                    </div>

                    <div className="menu-item">
                        <span>◇</span>
                        Vacancies
                    </div>

                    <div className="menu-item">
                        <span>✓</span>
                        Interviews
                    </div>

                </div>

                {/* PROFILE */}

                <div className="profile-wrapper">
    <button
        className="profile-button"
        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
    >
        <span>
            ◉
        </span>

        <div>
            <strong>
                {user?.name || "HR Manager"}
            </strong>

            <small>
                {user?.role || "HR Manager"}
            </small>
        </div>
    </button>

    {profileMenuOpen && (
        <div className="profile-menu">
            <button
                className="profile-menu-item"
                onClick={() => {
                    // Profile can be implemented later
                    setProfileMenuOpen(false);
                }}
            >
                Profile
            </button>

            <button
                className="profile-menu-item logout-item"
                onClick={handleLogout}
            >
                Log out
            </button>
        </div>
    )}
</div>
            </aside>

            {/* =================================================
                MAIN CONTENT
            ================================================= */}

            <main className="dashboard-content">

                {/* =================================================
                    TOP BAR
                ================================================= */}

                <header className="topbar">

                    <div className="search">

                        <span>⌕</span>

                        <input
                            type="text"
                            placeholder="Search vacancies..."
                            value={searchTerm}
                            onChange={(e) =>
                                setSearchTerm(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <button
                        className="theme-toggle"
                        onClick={() =>
                            setDarkMode(!darkMode)
                        }
                        aria-label="Toggle theme"
                    >
                        <span className="theme-icon">
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

                    <button
                        className="ai-button"
                    >
                        AI Chats ▣
                    </button>

                </header>

                {/* =================================================
                    PAGE HEADER
                ================================================= */}

                <div className="page-header">

                    <div>

                        <p className="page-eyebrow">
                            RECRUITMENT MANAGEMENT
                        </p>

                        <h1>
                            Current Opens
                        </h1>

                        <p className="page-description">
                            Create and manage vacancies
                            and keep track of candidates
                            throughout the hiring process.
                        </p>

                    </div>

                    <div className="header-actions">

                        <button
                            className="refresh-button"
                            onClick={handleRefresh}
                            title="Refresh dashboard"
                        >
                            ↻
                        </button>

                        <button
                            className="create-vacancy-button"
                            onClick={() =>
                                setShowCreateVacancy(
                                    true
                                )
                            }
                        >
                            <span>
                                ＋
                            </span>

                            Create Vacancy
                        </button>

                    </div>

                </div>

                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <div className="dashboard-error">
                        {error}
                    </div>
                )}

                {/* =================================================
                    SUMMARY
                ================================================= */}

                <div className="vacancy-summary">

                    <div>
                        <strong>
                            {openVacancies}
                        </strong>

                        <span>
                            Open vacancies
                        </span>
                    </div>

                    <div>
                        <strong>
                            {totalCandidates}
                        </strong>

                        <span>
                            Total candidates
                        </span>
                    </div>

                    <div>
                        <strong>
                            {shortlistedCandidates}
                        </strong>

                        <span>
                            Shortlisted
                        </span>
                    </div>

                </div>

                {/* =================================================
                    VACANCIES
                ================================================= */}

                {loading ? (

                    <div className="loading-message">
                        Loading vacancies...
                    </div>

                ) : filteredVacancies.length === 0 ? (

                    <div className="empty-vacancy-card">

                        {searchTerm ? (
                            <>
                                <h2>
                                    No vacancies found
                                </h2>

                                <p>
                                    Try searching for a
                                    different position or
                                    department.
                                </p>
                            </>
                        ) : (
                            <>
                                <h2>
                                    No vacancies yet
                                </h2>

                                <p>
                                    Create your first vacancy
                                    to start recruiting
                                    candidates.
                                </p>
                            </>
                        )}

                    </div>

                ) : (

                    <div className="job-grid">

                        {filteredVacancies.map(
                            (vacancy) => (

                                <div
                                    className="job-card"
                                    key={vacancy.id}
                                >

                                    <div
                                        className="job-card-inner"
                                    >

                                        <div className="job-date">
                                            {(
                                                vacancy.status ||
                                                "open"
                                            ).toUpperCase()}
                                        </div>

                                        <div
                                            className="job-status"
                                        ></div>

                                        <p className="company-name">
                                            Altrium
                                        </p>

                                        <h2>
                                            {vacancy.title}
                                        </h2>

                                        <div className="job-tags">

                                            <span>
                                                {
                                                    vacancy.employment_type ||
                                                    "Full time"
                                                }
                                            </span>

                                            <span>
                                                {
                                                    vacancy.department ||
                                                    "Human Resources"
                                                }
                                            </span>

                                            <span>
                                                {vacancy.minimum_experience
                                                    ? `${vacancy.minimum_experience}+ years`
                                                    : "No experience"}
                                            </span>

                                        </div>

                                    </div>

                                    <div className="job-footer">

                                        <div className="candidate-info">

                                            <strong>
                                                CANDIDATES
                                            </strong>

                                            <span className="candidate-count">
                                                {
                                                    vacancy.candidates_count
                                                }
                                            </span>

                                        </div>

                                        <div className="job-actions">

                                            <button
                                                onClick={() =>
                                                    handleViewCandidates(
                                                        vacancy.id
                                                    )
                                                }
                                            >
                                                Candidates
                                            </button>

                                            <button
                                                onClick={() =>
                                                    handleViewDetails(
                                                        vacancy.id
                                                    )
                                                }
                                            >
                                                Details →
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                )}

                {/* =================================================
                    CREATE VACANCY MODAL
                ================================================= */}

                {showCreateVacancy && (

                    <div className="modal-overlay">

                        <div className="vacancy-modal">

                            <button
                                className="modal-close"
                                onClick={() =>
                                    setShowCreateVacancy(
                                        false
                                    )
                                }
                            >
                                ×
                            </button>

                            <p className="modal-eyebrow">
                                RECRUITMENT
                            </p>

                            <h2>
                                Create a vacancy
                            </h2>

                            <p className="modal-description">
                                Add a new position that
                                your hiring team can
                                recruit candidates for.
                            </p>

                            <form
                                onSubmit={
                                    handleCreateVacancy
                                }
                            >

                                <div className="form-group">

                                    <label>
                                        Position title
                                    </label>

                                    <input
                                        type="text"
                                        placeholder="e.g. Software Engineer"
                                        value={
                                            newVacancy.title
                                        }
                                        onChange={(e) =>
                                            setNewVacancy({
                                                ...newVacancy,
                                                title:
                                                    e.target.value,
                                            })
                                        }
                                        required
                                    />

                                </div>

                                <div className="form-group">

                                    <label>
                                        Department
                                    </label>

                                    <input
                                        type="text"
                                        placeholder="e.g. Human Resources"
                                        value={
                                            newVacancy.department
                                        }
                                        onChange={(e) =>
                                            setNewVacancy({
                                                ...newVacancy,
                                                department:
                                                    e.target.value,
                                            })
                                        }
                                        required
                                    />

                                </div>

                                <div className="form-group">

                                    <label>
                                        Job description
                                    </label>

                                    <textarea
                                        placeholder="Briefly describe the position"
                                        value={
                                            newVacancy.description
                                        }
                                        onChange={(e) =>
                                            setNewVacancy({
                                                ...newVacancy,
                                                description:
                                                    e.target.value,
                                            })
                                        }
                                        required
                                    />

                                </div>

                                <div className="form-group">

                                    <label>
                                        Responsibilities
                                    </label>

                                    <textarea
                                        placeholder="Main responsibilities"
                                        value={
                                            newVacancy.responsibilities
                                        }
                                        onChange={(e) =>
                                            setNewVacancy({
                                                ...newVacancy,
                                                responsibilities:
                                                    e.target.value,
                                            })
                                        }
                                    />

                                </div>

                                <div className="form-group">

                                    <label>
                                        Minimum experience
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="e.g. 2"
                                        value={
                                            newVacancy.minimum_experience
                                        }
                                        onChange={(e) =>
                                            setNewVacancy({
                                                ...newVacancy,
                                                minimum_experience:
                                                    e.target.value,
                                            })
                                        }
                                        required
                                    />

                                </div>

                                <div className="form-group">

                                    <label>
                                        Employment type
                                    </label>

                                    <select
                                        value={
                                            newVacancy.employment_type
                                        }
                                        onChange={(e) =>
                                            setNewVacancy({
                                                ...newVacancy,
                                                employment_type:
                                                    e.target.value,
                                            })
                                        }
                                    >
                                        <option>
                                            Full time
                                        </option>

                                        <option>
                                            Part time
                                        </option>

                                        <option>
                                            Internship
                                        </option>

                                        <option>
                                            Contract
                                        </option>
                                    </select>

                                </div>

                                <button
                                    type="submit"
                                    className="modal-create-button"
                                >
                                    Create Vacancy
                                </button>

                            </form>

                        </div>

                    </div>

                )}

                {/* =================================================
                    CANDIDATE LIST MODAL
                ================================================= */}

                {selectedCandidate && (

                    <div className="modal-overlay">

                        <div className="candidate-modal">

                            <button
                                className="modal-close"
                                onClick={() => {
                                    setSelectedCandidate(null);
                                    setShowExtractedText(false);
                                }}
                            >
                                ×
                            </button>

                            <p className="modal-eyebrow">
                                APPLICATIONS
                            </p>

                            <h2>
                                Candidates
                            </h2>

                            <p className="modal-description">
                                Candidates who have applied for this
                                vacancy.
                            </p>

                            {candidateLoading ? (

                                <div className="loading-message">
                                    Loading candidates...
                                </div>

                            ) : selectedCandidate.applications.length === 0 ? (

                                <div className="no-candidates">

                                    <h3>
                                        No candidates yet
                                    </h3>

                                    <p>
                                        No applications have been
                                        submitted for this vacancy.
                                    </p>

                                </div>

                            ) : (

                                <div className="candidate-list">

                                    {selectedCandidate.applications.map(
                                        (application, index) => {

                                            const candidate =
                                                application.candidate;

                                            const candidateUser =
                                                candidate?.user;

                                            const cv =
                                                application.cv;

                                            const cvStats =
                                                getCvStats(cv);

                                            return (

                                                <div
                                                    className={`candidate-card ${
                                                        index === 0
                                                            ? "top-candidate"
                                                            : ""
                                                    }`}
                                                    key={application.id}
                                                >

                                                    {/* CANDIDATE HEADER */}

                                                    <div className="candidate-card-header">

                                                        {/* RANKING */}

                                                        <div className="candidate-ranking">
                                                            #{index + 1}
                                                        </div>

                                                        <div className="candidate-avatar">
                                                            {(
                                                                candidateUser?.name ||
                                                                "C"
                                                            )
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </div>

                                                        <div className="candidate-main-info">

                                                            <h3>
                                                                {candidateUser?.name ||
                                                                    "Candidate"}
                                                            </h3>

                                                            <p>
                                                                {candidateUser?.email ||
                                                                    "No email available"}
                                                            </p>

                                                        </div>

                                                        {/* MATCH SCORE */}

                                                        <div className="candidate-score-summary">

                                                            <strong>
                                                                {getMatchScore(
                                                                    application
                                                                ) !== null
                                                                    ? `${getMatchScore(
                                                                          application
                                                                      ).toFixed(
                                                                          1
                                                                      )}%`
                                                                    : "N/A"}
                                                            </strong>

                                                            <span>
                                                                {getMatchCategory(
                                                                    application
                                                                )}
                                                            </span>

                                                        </div>

                                                        <span
                                                            className={`candidate-status status-${
                                                                application.status ||
                                                                "new"
                                                            }`}
                                                        >
                                                            {(
                                                                application.status ||
                                                                "new"
                                                            ).toUpperCase()}
                                                        </span>

                                                    </div>

                                                    {/* CANDIDATE DETAILS */}

                                                    <div className="candidate-details-grid">

                                                        <div>
                                                            <span>
                                                                Phone
                                                            </span>

                                                            <strong>
                                                                {candidate?.phone ||
                                                                    "Not provided"}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                Location
                                                            </span>

                                                            <strong>
                                                                {candidate?.address ||
                                                                    "Not provided"}
                                                            </strong>
                                                        </div>

                                                    </div>

                                                    {/* =================================================
                                                        CV SECTION
                                                    ================================================= */}

                                                    {cv && (

                                                        <div className="cv-section">

                                                            <div className="cv-section-header">

                                                                <div>

                                                                    <span className="cv-section-label">
                                                                        CV
                                                                    </span>

                                                                    <a
                                                                        href={`${STORAGE_URL}/${cv.file_path}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="cv-file-link"
                                                                    >
                                                                        📄{" "}
                                                                        {cv.file_name ||
                                                                            "View CV"}
                                                                    </a>

                                                                </div>

                                                                <span className="cv-processing-status">
                                                                    {cv.processing_status ||
                                                                        "pending"}
                                                                </span>

                                                            </div>

                                                            {/* CV STATS */}

                                                            <div className="cv-stats">

                                                                <div className="cv-stat">

                                                                    <span>
                                                                        EXPERIENCE
                                                                    </span>

                                                                    <strong>
                                                                        {
                                                                            cvStats.experience
                                                                        }
                                                                    </strong>

                                                                </div>

                                                                <div className="cv-stat">

                                                                    <span>
                                                                        SKILLS
                                                                    </span>

                                                                    <strong>
                                                                        {
                                                                            cvStats.skills
                                                                        }
                                                                    </strong>

                                                                </div>

                                                                <div className="cv-stat">

                                                                    <span>
                                                                        EDUCATION
                                                                    </span>

                                                                    <strong>
                                                                        {
                                                                            cvStats.education
                                                                        }
                                                                    </strong>

                                                                </div>

                                                                <div className="cv-stat">

                                                                    <span>
                                                                        CERTIFICATIONS
                                                                    </span>

                                                                    <strong>
                                                                        {
                                                                            cvStats.certifications
                                                                        }
                                                                    </strong>

                                                                </div>

                                                                <div className="cv-stat">

                                                                    <span>
                                                                        LANGUAGES
                                                                    </span>

                                                                    <strong>
                                                                        {
                                                                            cvStats.languages
                                                                        }
                                                                    </strong>

                                                                </div>

                                                                <div className="cv-stat">

                                                                    <span>
                                                                        PROCESSING
                                                                    </span>

                                                                    <strong>
                                                                        {
                                                                            cv.processing_status ||
                                                                            "Pending"
                                                                        }
                                                                    </strong>

                                                                </div>

                                                            </div>

                                                            {/* EXTRACTED TEXT */}

                                                            <button
                                                                type="button"
                                                                className="extracted-text-button"
                                                                onClick={() =>
                                                                    setShowExtractedText(
                                                                        !showExtractedText
                                                                    )
                                                                }
                                                            >
                                                                {showExtractedText
                                                                    ? "Hide extracted text"
                                                                    : "View extracted text"}
                                                            </button>

                                                            {showExtractedText && (

                                                                <div className="extracted-text">

                                                                    {cv.extracted_text ||
                                                                        "No extracted text available."}

                                                                </div>

                                                            )}

                                                        </div>

                                                    )}

                                                    {/* =================================================
                                                        MATCHING STATISTICS
                                                    ================================================= */}

                                                    {(() => {

                                                        const matchScore =
                                                            getMatchScore(
                                                                application
                                                            );

                                                        const matchCategory =
                                                            getMatchCategory(
                                                                application
                                                            );

                                                        if (
                                                            matchScore ===
                                                            null
                                                        ) {
                                                            return (
                                                                <div className="matching-section matching-not-evaluated">

                                                                    <div className="matching-header">

                                                                        <div>

                                                                            <span className="matching-label">
                                                                                CV MATCH
                                                                            </span>

                                                                            <h4>
                                                                                Candidate Match
                                                                            </h4>

                                                                            <p>
                                                                                This application has not been
                                                                                evaluated yet.
                                                                            </p>

                                                                        </div>

                                                                    </div>

                                                                </div>
                                                            );
                                                        }

                                                        const skillsScore =
                                                            Number(
                                                                application.skills_score
                                                            ) || 0;

                                                        const experienceScore =
                                                            Number(
                                                                application.experience_score
                                                            ) || 0;

                                                        const relevanceScore =
                                                            Number(
                                                                application.relevance_score
                                                            ) || 0;

                                                        const skillsPercentage =
                                                            Math.min(
                                                                100,
                                                                Math.max(
                                                                    0,
                                                                    (skillsScore /
                                                                        50) *
                                                                        100
                                                                )
                                                            );

                                                        const experiencePercentage =
                                                            Math.min(
                                                                100,
                                                                Math.max(
                                                                    0,
                                                                    (experienceScore /
                                                                        30) *
                                                                        100
                                                                )
                                                            );

                                                        const relevancePercentage =
                                                            Math.min(
                                                                100,
                                                                Math.max(
                                                                    0,
                                                                    (relevanceScore /
                                                                        20) *
                                                                        100
                                                                )
                                                            );

                                                        return (
                                                            <div className="matching-section">

                                                                {/* HEADER */}

                                                                <div className="matching-header">

                                                                    <div>

                                                                        <span className="matching-label">
                                                                            CV MATCH
                                                                        </span>

                                                                        <h4>
                                                                            Candidate Match
                                                                        </h4>

                                                                        <p>
                                                                            AI-assisted compatibility analysis
                                                                            for this vacancy.
                                                                        </p>

                                                                    </div>

                                                                    <div className="match-score-circle">

                                                                        <strong>
                                                                            {matchScore.toFixed(
                                                                                1
                                                                            )}
                                                                            %
                                                                        </strong>

                                                                        <span>
                                                                            Match
                                                                        </span>

                                                                    </div>

                                                                </div>

                                                                {/* CATEGORY */}

                                                                <div className="match-category">

                                                                    <span className="match-category-dot"></span>

                                                                    {matchCategory}

                                                                </div>

                                                                {/* OVERALL SCORE */}

                                                                <div className="match-overall-bar">

                                                                    <div className="match-overall-header">

                                                                        <span>
                                                                            Overall match score
                                                                        </span>

                                                                        <strong>
                                                                            {matchScore.toFixed(
                                                                                1
                                                                            )}{" "}
                                                                            / 100
                                                                        </strong>

                                                                    </div>

                                                                    <div className="match-bar-track">

                                                                        <div
                                                                            className="match-bar-fill overall"
                                                                            style={{
                                                                                width: `${matchScore}%`,
                                                                            }}
                                                                        ></div>

                                                                    </div>

                                                                </div>

                                                                {/* SCORE BREAKDOWN */}

                                                                <div className="match-breakdown">

                                                                    {/* SKILLS */}

                                                                    <div className="match-breakdown-card">

                                                                        <div className="match-breakdown-header">

                                                                            <div>

                                                                                <span>
                                                                                    Skills
                                                                                </span>

                                                                                <strong>
                                                                                    {skillsScore.toFixed(
                                                                                        1
                                                                                    )}{" "}
                                                                                    / 50
                                                                                </strong>

                                                                            </div>

                                                                            <span className="match-breakdown-percentage">
                                                                                {skillsPercentage.toFixed(
                                                                                    0
                                                                                )}
                                                                                %
                                                                            </span>

                                                                        </div>

                                                                        <div className="match-bar-track">

                                                                            <div
                                                                                className="match-bar-fill skills"
                                                                                style={{
                                                                                    width: `${skillsPercentage}%`,
                                                                                }}
                                                                            ></div>

                                                                        </div>

                                                                    </div>

                                                                    {/* EXPERIENCE */}

                                                                    <div className="match-breakdown-card">

                                                                        <div className="match-breakdown-header">

                                                                            <div>

                                                                                <span>
                                                                                    Experience
                                                                                </span>

                                                                                <strong>
                                                                                    {experienceScore.toFixed(
                                                                                        1
                                                                                    )}{" "}
                                                                                    / 30
                                                                                </strong>

                                                                            </div>

                                                                            <span className="match-breakdown-percentage">
                                                                                {experiencePercentage.toFixed(
                                                                                    0
                                                                                )}
                                                                                %
                                                                            </span>

                                                                        </div>

                                                                        <div className="match-bar-track">

                                                                            <div
                                                                                className="match-bar-fill experience"
                                                                                style={{
                                                                                    width: `${experiencePercentage}%`,
                                                                                }}
                                                                            ></div>

                                                                        </div>

                                                                    </div>

                                                                    {/* RELEVANCE */}

                                                                    <div className="match-breakdown-card">

                                                                        <div className="match-breakdown-header">

                                                                            <div>

                                                                                <span>
                                                                                    Relevance
                                                                                </span>

                                                                                <strong>
                                                                                    {relevanceScore.toFixed(
                                                                                        1
                                                                                    )}{" "}
                                                                                    / 20
                                                                                </strong>

                                                                            </div>

                                                                            <span className="match-breakdown-percentage">
                                                                                {relevancePercentage.toFixed(
                                                                                    0
                                                                                )}
                                                                                %
                                                                            </span>

                                                                        </div>

                                                                        <div className="match-bar-track">

                                                                            <div
                                                                                className="match-bar-fill relevance"
                                                                                style={{
                                                                                    width: `${relevancePercentage}%`,
                                                                                }}
                                                                            ></div>

                                                                        </div>

                                                                    </div>

                                                                </div>

                                                                {/* SUMMARY */}

                                                                <div className="match-summary">

                                                                    <div>

                                                                        <span>
                                                                            Category
                                                                        </span>

                                                                        <strong>
                                                                            {matchCategory}
                                                                        </strong>

                                                                    </div>

                                                                    <div>

                                                                        <span>
                                                                            Overall Score
                                                                        </span>

                                                                        <strong>
                                                                            {matchScore.toFixed(
                                                                                1
                                                                            )}
                                                                            %
                                                                        </strong>

                                                                    </div>

                                                                    <div>

                                                                        <span>
                                                                            CV Status
                                                                        </span>

                                                                        <strong>
                                                                            {application.cv?.processing_status ||
                                                                                "Pending"}
                                                                        </strong>

                                                                    </div>

                                                                </div>

                                                                <p className="match-note">
                                                                    Match score is calculated from skills,
                                                                    experience and relevance against the
                                                                    requirements of the vacancy.
                                                                </p>

                                                            </div>
                                                        );
                                                    })()}

                                                    {/* =================================================
                                                        APPLICATION FOOTER
                                                    ================================================= */}

                                                    <div className="candidate-card-footer">

                                                        <div>

                                                            <span>
                                                                Application status
                                                            </span>

                                                            <select
                                                                value={
                                                                    application.status ||
                                                                    "new"
                                                                }
                                                                disabled={
                                                                    statusUpdating
                                                                }
                                                                onChange={(e) =>
                                                                    handleStatusChange(
                                                                        application.id,
                                                                        e.target.value
                                                                    )
                                                                }
                                                            >

                                                                <option value="new">
                                                                    New
                                                                </option>

                                                                <option value="screening">
                                                                    Screening
                                                                </option>

                                                                <option value="shortlisted">
                                                                    Shortlisted
                                                                </option>

                                                                <option value="interview">
                                                                    Interview
                                                                </option>

                                                                <option value="selected">
                                                                    Selected
                                                                </option>

                                                                <option value="rejected">
                                                                    Rejected
                                                                </option>

                                                            </select>

                                                        </div>

                                                        <div className="application-date">

                                                            <span>
                                                                Applied
                                                            </span>

                                                            <strong>
                                                                {application.applied_at
                                                                    ? new Date(
                                                                          application.applied_at
                                                                      ).toLocaleDateString()
                                                                    : "N/A"}
                                                            </strong>

                                                        </div>

                                                    </div>

                                                </div>

                                            );
                                        }
                                    )}

                                </div>

                            )}

                        </div>

                    </div>

                )}

                {/* =================================================
                    VACANCY DETAILS
                ================================================= */}

                {selectedVacancy && (

                    <div className="modal-overlay">

                        <div className="vacancy-details-modal">

                            <button
                                className="modal-close"
                                onClick={() =>
                                    setSelectedVacancy(
                                        null
                                    )
                                }
                            >
                                ×
                            </button>

                            <p className="modal-eyebrow">
                                VACANCY DETAILS
                            </p>

                            {detailsLoading ? (

                                <div className="loading-message">
                                    Loading vacancy details...
                                </div>

                            ) : (

                                <>

                                    <div className="details-header">

                                        <div>

                                            <h2>
                                                {
                                                    selectedVacancy.title
                                                }
                                            </h2>

                                            <p className="details-department">
                                                {
                                                    selectedVacancy.department
                                                }
                                            </p>

                                        </div>

                                        <span className="details-status">
                                            {
                                                selectedVacancy.status ||
                                                "open"
                                            }
                                        </span>

                                    </div>

                                    <div className="details-tags">

                                        <span>
                                            {
                                                selectedVacancy.employment_type ||
                                                "Not specified"
                                            }
                                        </span>

                                        <span>
                                            {
                                                selectedVacancy.minimum_experience
                                                    ? `${selectedVacancy.minimum_experience}+ years experience`
                                                    : "No experience required"
                                            }
                                        </span>

                                    </div>

                                    <div className="details-section">

                                        <h3>
                                            Description
                                        </h3>

                                        <p>
                                            {
                                                selectedVacancy.description ||
                                                "No description provided."
                                            }
                                        </p>

                                    </div>

                                    <div className="details-section">

                                        <h3>
                                            Responsibilities
                                        </h3>

                                        <p>
                                            {
                                                selectedVacancy.responsibilities ||
                                                "No responsibilities added yet."
                                            }
                                        </p>

                                    </div>

                                    <div className="details-footer">

                                        <div>

                                            <span>
                                                Created
                                            </span>

                                            <strong>
                                                {
                                                    selectedVacancy.created_at
                                                        ? new Date(
                                                              selectedVacancy.created_at
                                                          ).toLocaleDateString()
                                                        : "N/A"
                                                }
                                            </strong>

                                        </div>

                                        <div>

                                            <span>
                                                Candidates
                                            </span>

                                            <strong>
                                                {
                                                    selectedVacancy.candidates_count ||
                                                    0
                                                }
                                            </strong>

                                        </div>

                                    </div>

                                    <div className="vacancy-details-actions">

                                        <button
                                            type="button"
                                            className="close-details-button"
                                            onClick={() =>
                                                setSelectedVacancy(null)
                                            }
                                        >
                                            Close
                                        </button>

                                        <button
                                            type="button"
                                            className="delete-vacancy-button"
                                            onClick={() =>
                                                deleteVacancy(
                                                    selectedVacancy.id
                                                )
                                            }
                                        >
                                            Delete Vacancy
                                        </button>

                                    </div>

                                </>

                            )}

                        </div>

                    </div>

                )}

            </main>

        </div>
    );
}

export default HRDashboard;