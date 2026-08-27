import React, { useState } from "react";
import "./Home.css";

const Home = () => {
    const [showRoleMenu, setShowRoleMenu] = useState(false);

    return (
        <div className="home-page">

            {/* =========================
                NAVBAR
            ========================= */}

            <nav className="home-navbar">

                <div
                    className="home-logo"
                    onClick={() => window.location.href = "/"}
                >
                    <div className="logo-mark">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>

                    <span>HireTrack</span>
                </div>

                <div className="home-nav-links">
                    <a href="#how-it-works">How it works</a>
                    <a href="#for-candidates">Candidates</a>
                    <a href="#for-hr">HR Teams</a>
                </div>

                <div className="home-nav-actions">

                    <button
                        className="nav-login"
                        onClick={() => window.location.href = "/recruitment-system/candidate-login"}
                    >
                        Log in
                    </button>

                    <button
                        className="nav-signup"
                        onClick={() => setShowRoleMenu(true)}
                    >
                        Get started
                    </button>

                </div>

            </nav>


            {/* =========================
                HERO
            ========================= */}

            <main>

                <section className="hero-section">

                    <div className="hero-content">

                        <div className="hero-eyebrow">
                            RECRUITMENT, SIMPLIFIED
                        </div>

                        <h1>
                            Find the right
                            <br />
                            <span>people.</span>
                            <br />
                            Build better teams.
                        </h1>

                        <p>
                            A smarter recruitment workspace that connects
                            candidates and HR teams from application to hire.
                        </p>

                        <div className="hero-buttons">

                            <button
                                className="hero-primary-button"
                                onClick={() => setShowRoleMenu(true)}
                            >
                                Get started
                                <span>→</span>
                            </button>

                            <button
                                className="hero-secondary-button"
                                onClick={() =>
                                    window.location.href = "/recruitment-system/candidate-login"
                                }
                            >
                                I'm a candidate
                            </button>

                        </div>

                    </div>


                    {/* =========================
                        HERO VISUAL
                    ========================= */}

                    <div className="hero-visual">

                        <div className="visual-glow"></div>

                        <div className="dashboard-window">

                            <div className="window-header">

                                <div className="window-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>

                                <div className="window-title">
                                    Recruitment overview
                                </div>

                            </div>


                            <div className="window-body">

                                <div className="window-heading">

                                    <div>
                                        <small>HIRING PIPELINE</small>
                                        <h3>Current openings</h3>
                                    </div>

                                    <div className="window-add">
                                        +
                                    </div>

                                </div>


                                <div className="mini-stats">

                                    <div>
                                        <strong>05</strong>
                                        <span>Open roles</span>
                                    </div>

                                    <div>
                                        <strong>24</strong>
                                        <span>Candidates</span>
                                    </div>

                                    <div>
                                        <strong>08</strong>
                                        <span>Shortlisted</span>
                                    </div>

                                </div>


                                <div className="candidate-preview">

                                    <div className="candidate-avatar">
                                        SP
                                    </div>

                                    <div className="candidate-info">
                                        <strong>Sarah Perera</strong>
                                        <span>Junior HR Manager</span>
                                    </div>

                                    <div className="match-score">
                                        <strong>93%</strong>
                                        <span>Match</span>
                                    </div>

                                </div>


                                <div className="candidate-preview">

                                    <div className="candidate-avatar avatar-two">
                                        ML
                                    </div>

                                    <div className="candidate-info">
                                        <strong>Megan Lara</strong>
                                        <span>Software Engineer</span>
                                    </div>

                                    <div className="match-score">
                                        <strong>87%</strong>
                                        <span>Match</span>
                                    </div>

                                </div>


                                <div className="pipeline">

                                    <div className="pipeline-label">
                                        Recruitment progress
                                    </div>

                                    <div className="pipeline-line">
                                        <span className="active"></span>
                                        <span className="active"></span>
                                        <span className="active"></span>
                                        <span></span>
                                        <span></span>
                                    </div>

                                    <div className="pipeline-text">
                                        Application&nbsp;&nbsp;
                                        Review&nbsp;&nbsp;
                                        Shortlist&nbsp;&nbsp;
                                        Interview&nbsp;&nbsp;
                                        Decision
                                    </div>

                                </div>

                            </div>

                        </div>


                        <div className="floating-card floating-match">

                            <div className="floating-icon">
                                ✓
                            </div>

                            <div>
                                <strong>CV matched</strong>
                                <span>93% compatibility</span>
                            </div>

                        </div>


                        <div className="floating-card floating-status">

                            <span className="status-dot"></span>

                            <div>
                                <strong>Application</strong>
                                <span>Under review</span>
                            </div>

                        </div>

                    </div>

                </section>


                {/* =========================
                    TRUST / INTRO
                ========================= */}

                <section className="intro-strip">

                    <span>ONE PLATFORM</span>

                    <p>
                        Everything your recruitment process needs,
                        in one place.
                    </p>

                </section>


                {/* =========================
                    ROLE SECTION
                ========================= */}

                <section
                    className="roles-section"
                    id="how-it-works"
                >

                    <div className="section-heading">

                        <div className="section-eyebrow">
                            MADE FOR BOTH SIDES
                        </div>

                        <h2>
                            One platform.
                            <br />
                            Two experiences.
                        </h2>

                    </div>


                    <div className="role-cards">

                        {/* CANDIDATE */}

                        <div
                            className="role-card candidate-role"
                            id="for-candidates"
                        >

                            <div className="role-number">
                                01
                            </div>

                            <div className="role-icon">
                                ◇
                            </div>

                            <h3>
                                For candidates
                            </h3>

                            <p>
                                Discover opportunities, manage your CV,
                                apply to vacancies and follow your recruitment
                                journey from one dashboard.
                            </p>

                            <ul>
                                <li>View available vacancies</li>
                                <li>Upload and manage your CV</li>
                                <li>Track application progress</li>
                                <li>View screening results</li>
                            </ul>

                            <button
                                onClick={() =>
                                    window.location.href = "/recruitment-system/candidate-login"
                                }
                            >
                                Candidate login
                                <span>→</span>
                            </button>

                        </div>


                        {/* HR */}

                        <div
                            className="role-card hr-role"
                            id="for-hr"
                        >

                            <div className="role-number">
                                02
                            </div>

                            <div className="role-icon">
                                +
                            </div>

                            <h3>
                                For HR teams
                            </h3>

                            <p>
                                Create vacancies, review candidates, screen
                                CVs and manage the entire recruitment pipeline
                                in one workspace.
                            </p>

                            <ul>
                                <li>Create and manage vacancies</li>
                                <li>Review candidate CVs</li>
                                <li>Screen and score applications</li>
                                <li>Track recruitment stages</li>
                            </ul>

                            <button
                                onClick={() =>
                                    window.location.href = "/recruitment-system/hr-login"
                                }
                            >
                                HR login
                                <span>→</span>
                            </button>

                        </div>

                    </div>

                </section>


                {/* =========================
                    FEATURES
                ========================= */}

                <section className="features-section">

                    <div className="features-heading">

                        <div className="section-eyebrow">
                            THE WORKFLOW
                        </div>

                        <h2>
                            From application
                            <br />
                            to decision.
                        </h2>

                    </div>


                    <div className="workflow">

                        <div className="workflow-item">

                            <span>01</span>

                            <h3>
                                Discover
                            </h3>

                            <p>
                                Candidates explore vacancies that match
                                their skills and experience.
                            </p>

                        </div>


                        <div className="workflow-item">

                            <span>02</span>

                            <h3>
                                Apply
                            </h3>

                            <p>
                                Upload a CV and submit an application
                                directly to the selected vacancy.
                            </p>

                        </div>


                        <div className="workflow-item">

                            <span>03</span>

                            <h3>
                                Screen
                            </h3>

                            <p>
                                HR teams review applications and evaluate
                                candidate compatibility.
                            </p>

                        </div>


                        <div className="workflow-item">

                            <span>04</span>

                            <h3>
                                Hire
                            </h3>

                            <p>
                                Track candidates through interviews and
                                the final hiring decision.
                            </p>

                        </div>

                    </div>

                </section>


                {/* =========================
                    FINAL CTA
                ========================= */}

                <section className="final-cta">

                    <div>

                        <div className="section-eyebrow">
                            READY WHEN YOU ARE
                        </div>

                        <h2>
                            Recruitment should
                            <br />
                            feel this simple.
                        </h2>

                    </div>

                    <button
                        onClick={() => setShowRoleMenu(true)}
                    >
                        Create your account
                        <span>→</span>
                    </button>

                </section>

            </main>


            {/* =========================
                ROLE SELECTION MODAL
            ========================= */}

            {showRoleMenu && (

                <div
                    className="role-modal-overlay"
                    onClick={() => setShowRoleMenu(false)}
                >

                    <div
                        className="role-modal"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <button
                            className="modal-close"
                            onClick={() => setShowRoleMenu(false)}
                        >
                            ×
                        </button>

                        <div className="section-eyebrow">
                            CREATE ACCOUNT
                        </div>

                        <h2>
                            How will you use
                            <br />
                            HireTrack?
                        </h2>

                        <p>
                            Choose the account type that matches your role.
                        </p>


                        <div className="role-selection">

                            <button
                                onClick={() =>
                                    window.location.href =
                                        "/recruitment-system/register-candidate"
                                }
                            >

                                <span className="selection-icon">
                                    ◇
                                </span>

                                <div>
                                    <strong>
                                        I'm a candidate
                                    </strong>

                                    <small>
                                        Find jobs and track applications
                                    </small>
                                </div>

                                <span>→</span>

                            </button>


                            <button
                                onClick={() =>
                                    window.location.href =
                                        "/recruitment-system/register-hr"
                                }
                            >

                                <span className="selection-icon">
                                    +
                                </span>

                                <div>
                                    <strong>
                                        I'm an HR professional
                                    </strong>

                                    <small>
                                        Manage vacancies and candidates
                                    </small>
                                </div>

                                <span>→</span>

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
};

export default Home;