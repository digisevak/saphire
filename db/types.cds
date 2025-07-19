namespace saphire.hire.types;

type Sender : String enum {
    AI    = 'AI';
    HUMAN = 'Human'
}


type UserTypeEnum : String enum {
    CANDIDATE = 'CANDIDATE';
    COMPANY = 'COMPANY';
    ADMIN = 'ADMIN';
    HIRING_MANAGER = 'HIRING_MANAGER';
}

type ApplicationStatus : String enum {
    APPLIED = 'APPLIED';
    SCREENING = 'SCREENING';
    SHORTLISTED = 'SHORTLISTED';
    INTERVIEWED = 'INTERVIEWED';
    REJECTED = 'REJECTED';
    HIRED = 'HIRED';
    WITHDRAWN = 'WITHDRAWN';
}

type InterviewType : String enum {
    PHONE = 'Telephonic';
    VIDEO = 'VIDEO';
    IN_PERSON = 'IN_PERSON';
    AI_CHAT = 'AI_CHAT';
    TECHNICAL = 'TECHNICAL';
    HR_ROUND = 'HR_ROUND';
    MANAGERIAL = 'MANAGERIAL_ROUND'
}

type InterviewStatus : String enum {
    SCHEDULED = 'SCHEDULED';
    COMPLETED = 'COMPLETED';
    CANCELLED = 'CANCELLED';
    RESCHEDULED = 'RESCHEDULED';
    NO_SHOW = 'NO_SHOW';
}

type HiringDecisionType : String enum {
    HIRED = 'HIRED';
    REJECTED = 'REJECTED';
    ON_HOLD = 'ON_HOLD';
    WITHDRAWN = 'WITHDRAWN';
}

type SalaryType : String enum {
    ANNUAL = 'A';
    MONTHLY = 'M';
    HOURLY = 'H';
    PROJECT = 'P';
}

type JobTypeEnum : String enum {
    FULL_TIME = 'FULL_TIME';
    PART_TIME = 'PART_TIME';
    CONTRACT = 'CONTRACT';
    FREELANCE = 'FREELANCE';
    INTERNSHIP = 'INTERNSHIP';
    REMOTE = 'REMOTE';
    HYBRID = 'HYBRID';
}

type SkillLevel : Integer enum {
    BEGINNER = 1;
    BASIC = 2;
    INTERMEDIATE = 3;
    ADVANCED = 4;
    EXPERT = 5;
}

type AIModelPurpose : String enum {
    RESUME_PARSING = 'RESUME_PARSING';
    SKILL_MATCHING = 'SKILL_MATCHING';
    INTERVIEW_ANALYSIS = 'INTERVIEW_ANALYSIS';
    CANDIDATE_SCREENING = 'CANDIDATE_SCREENING';
    JOB_RECOMMENDATION = 'JOB_RECOMMENDATION';
    SENTIMENT_ANALYSIS = 'SENTIMENT_ANALYSIS';
}


type Address {
    street         : String(200);
    city          : String(100);
    state         : String(100);
    country       : String(100);
    postal_code   : String(20);
    coordinates   : {
        latitude  : Decimal(10, 8);
        longitude : Decimal(11, 8);
    };
}

type ContactInfo {
    primary_email    : String(255);
    secondary_email  : String(255);
    phone_number     : String(20);
    mobile_number    : String(20);
    linkedin_url     : String(500);
    portfolio_url    : String(500);
    github_url       : String(500);
}

type SalaryRange {
    min_salary    : Decimal(12, 2);
    max_salary    : Decimal(12, 2);
    currency      : String(10);
    salary_type   : SalaryType;
}

type AIConfiguration {
    model_name       : String(100);
    temperature      : Decimal(3, 2);
    max_tokens       : Integer;
    top_p           : Decimal(3, 2);
    frequency_penalty : Decimal(3, 2);
    presence_penalty  : Decimal(3, 2);
}

type MatchingCriteria {
    skills_weight      : Decimal(3, 2) default 0.4;
    experience_weight  : Decimal(3, 2) default 0.3;
    education_weight   : Decimal(3, 2) default 0.2;
    location_weight    : Decimal(3, 2) default 0.1;
    minimum_score      : Decimal(5, 2) default 60.0;
}

type InterviewFeedback {
    technical_score     : Decimal(5, 2);
    communication_score : Decimal(5, 2);
    cultural_fit_score  : Decimal(5, 2);
    overall_rating     : Decimal(5, 2);
    strengths          : array of String;
    areas_for_improvement : array of String;
    recommendation     : String(1000);
}

type SkillAssessment {
    skill_name         : String(200);
    assessed_level     : SkillLevel;
    years_experience   : Decimal(4, 2);
    certification_urls : array of String;
    projects          : array of String;
}

type ResumeParsingResult {
    extracted_text     : LargeString;
    personal_info     : ContactInfo;
    skills           : array of SkillAssessment;
    work_experience  : array of String;
    education        : array of String;
    certifications   : array of String;
    confidence_score : Decimal(5, 2);
    parsing_date     : DateTime;
}

type AIInsight {
    insight_type      : String(100);
    confidence_level  : Decimal(5, 2);
    description      : String(1000);
    recommendations  : array of String;
    created_at       : DateTime;
}

// ============================================================================
// FUNCTION RETURN TYPES
// ============================================================================
type CandidateMatch {
    candidate_id      : String;
    match_percentage  : Decimal(5, 2);
    skill_matches    : array of String;
    experience_match : Decimal(5, 2);
    education_match  : Decimal(5, 2);
    location_match   : Decimal(5, 2);
    summary          : String(500);
}

type JobRecommendation {
    job_id           : String;
    relevance_score  : Decimal(5, 2);
    matching_skills  : array of String;
    salary_fit       : Decimal(5, 2);
    location_fit     : Decimal(5, 2);
    recommendation_reason : String(500);
}

type ScreeningReport {
    candidate_id         : String;
    job_id              : String;
    overall_score       : Decimal(5, 2);
    technical_fit       : Decimal(5, 2);
    experience_relevance : Decimal(5, 2);
    cultural_fit        : Decimal(5, 2);
    red_flags          : array of String;
    green_flags        : array of String;
    next_steps         : array of String;
}

type DiversityMetrics {
    gender_distribution    : array of String;
    age_distribution      : array of String;
    location_distribution : array of String;
    education_distribution : array of String;
    experience_distribution : array of String;
}

type HiringAnalytics {
    total_applications     : Integer;
    screening_pass_rate   : Decimal(5, 2);
    interview_success_rate : Decimal(5, 2);
    time_to_hire         : Decimal(5, 2);
    cost_per_hire        : Decimal(10, 2);
    quality_of_hire      : Decimal(5, 2);
    diversity_metrics    : DiversityMetrics;
}