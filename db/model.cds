using {
    cuid,
    managed,
    User
} from '@sap/cds/common';


using saphire.hire.types from './types';

namespace saphire.hire;


entity Chats : cuid, managed {
    topic            : String @mandatory;
    model            : String @mandatory;
    streamingEnabled : Boolean default false;
    personality      : Association to one Personalities;
    messages         : Composition of many Messages
                           on messages.chat = $self;
    aiAgents : Association to one AIAgents
}

entity Personalities : cuid, managed {
    name         : String;
    instructions : String;
}

entity AIAgents : cuid, managed {
    agent_name : String(200);
    description : String(200) 
}

entity Messages : cuid, managed {
    text   : LargeString;
    model  : String @mandatory;
    sender : User;
    chat   : Association to one Chats;
}



entity UserType : cuid {
    user_type_name : String(200) @mandatory;
}

entity UserAccount : cuid, managed {
    user_type              : Association to one UserType;
    email                  : String(255) @mandatory;
    password               : String(100) @mandatory;
    date_of_birth         : Date;
    phone                 : String(20);
    is_active             : Boolean default true;
    contact_number        : String(10);
    email_verification_active : Boolean default false;
    email_notification_active : Boolean default true;
    user_image            : LargeBinary;
    registration_date     : Date default $now;
}

entity UserLog : cuid {
    user_account     : Association to one UserAccount @mandatory;
    last_login_date  : Date;
    last_job_apply_date : Date;
}



entity Company : cuid, managed {
    user_account        : Association to one UserAccount @mandatory;
    company_name        : String(100) @mandatory;
    profile_description : String(1000);
}

entity CompanyImage : cuid {
        company       : Association to one Company @mandatory;
        company_image : LargeBinary @mandatory;
}
            


entity SeekerProfile : cuid, managed {
    user_account        : Association to one UserAccount @mandatory;
    first_name          : String(50) @mandatory;
    last_name           : String(50) @mandatory;
    current_salary      : Decimal(10,2);
    is_annually_monthly : String(1); 
    currency            : String(50);
    resume_text         : LargeString;  
}

entity EducationDetail : cuid {
    seeker_profile          : Association to one SeekerProfile @mandatory;
    certificate_degree_name : String(250) @mandatory;
    major                   : String(250);
    institute_university_name : String(250) @mandatory;
    starting_date           : Date @mandatory;
    completion_date         : Date;
    percentage              : Decimal(5,2);
    cgpa                    : Decimal(4,2);
}

entity ExperienceDetail : cuid {
    seeker_profile       : Association to one SeekerProfile @mandatory;
    sequence_number      : Integer;
    is_current_job       : Boolean default false;
    start_date           : Date @mandatory;
    end_date             : Date;
    job_title            : String(50) @mandatory;
    company_name         : String(100) @mandatory;
    job_location_city    : String(50);
    job_location_state   : String(50);
    job_location_country : String(50);
    description          : String(4000);
}


entity SkillSet : cuid {
    skill_set_name : String(250) @mandatory;
    category       : String(100);
    description    : String(500);
}

entity SeekerSkillSet : cuid {
    seeker_profile : Association to one SeekerProfile @mandatory;
    skill_set      : Association to one SkillSet @mandatory;
    skill_level    : Integer; // 1-10 proficiency level
    years_experience : Decimal(4,2);
}


entity JobType : cuid {
    job_type_name : String(200) @mandatory;
    description   : String(500);
}

entity JobLocation : cuid {
    street_address : String(100);
    city           : String(50) @mandatory;
    state          : String(50) @mandatory;
    country        : String(50) @mandatory;
    zip_code       : String(50);
    latitude       : Decimal(10,8);
    longitude      : Decimal(11,8);
}

entity JobPost : cuid, managed {
    posted_by_id           : Integer @mandatory;
    job_type               : Association to one JobType @mandatory;
    company                : Association to one Company @mandatory;
    is_company_name_hidden : Boolean default false;
    job_description        : String(2500) @mandatory;
    job_location           : Association to one JobLocation;
    is_active              : Boolean default true;
    job_title              : String(100) @mandatory;
    salary_min             : Decimal(10,2);
    salary_max             : Decimal(10,2);
    currency               : String(50);
    application_deadline   : Date;
    experience_required    : String(100);
}

entity JobPostSkillSet : cuid {
    job_post     : Association to one JobPost @mandatory;
    skill_set    : Association to one SkillSet @mandatory;
    skill_level  : Integer; 
    is_mandatory : Boolean default false;
}


entity JobPostActivity : cuid {
    seeker_profile : Association to one SeekerProfile @mandatory;
    job_post       : Association to one JobPost @mandatory;
    apply_date     : Date default $now;
    status         : String(20) default 'APPLIED'; 
    ai_match_score : Decimal(5,2);
    notes          : String(2000);
    withdraw_reason : String(500);
}


entity AIScreeningResult : cuid, managed {
    job_post               : Association to one JobPost @mandatory;
    seeker_profile         : Association to one SeekerProfile @mandatory;
    overall_match_score    : Decimal(5,2) @mandatory; // 0-100 percentage
    skills_match_score     : Decimal(5,2); // Skills compatibility score
    experience_match_score : Decimal(5,2); // Experience relevance score
    education_match_score  : Decimal(5,2); // Education fit score
    recommendation         : String(1000); // AI recommendation
    screening_date         : DateTime default $now;
    confidence_level       : Decimal(5,2); // AI confidence in the assessment
}

entity AISkillMatch : cuid {
    screening_result  : Association to one AIScreeningResult @mandatory;
    skill_set         : Association to one SkillSet @mandatory;
    required_level    : Integer; 
    candidate_level   : Integer; 
    match_percentage  : Decimal(5,2);
    gap_analysis      : String(500); 
}


entity InterviewSchedule : cuid, managed {
    job_post_activity     : Association to one JobPostActivity @mandatory;
    interview_date_time   : DateTime @mandatory;
    interview_type        : String(20); 
    interviewer_email     : String(255);
    interviewer_notes     : String(2000);
    candidate_feedback    : String(2000);
    status                : String(20) default 'SCHEDULED';
    ai_chat_session       : Association to one Chats; 
    meeting_link          : String(500);
    duration_minutes      : Integer;
}

entity HiringDecision : cuid, managed {
    job_post_activity : Association to one JobPostActivity @mandatory;
    decision          : String(20) @mandatory;
    decision_date     : Date default $now;
    salary_offered    : Decimal(10,2);
    currency          : String(50);
    notes             : String(2000);
    hiring_manager_id : String;
    start_date        : Date;
    contract_type     : String(50);
}


entity AIModel : cuid {
    model_name    : String(100) @mandatory;
    model_version : String(50);
    purpose       : String(200); 
    endpoint_url  : String(500);
    is_active     : Boolean default true;
    parameters    : LargeString;
    cost_per_call : Decimal(10,4)
}

entity SkillTaxonomy : cuid, managed {
    skill_name     : String(200) @mandatory;
    skill_category : String(100);
    synonyms       : String(1000); 
    parent_skill   : Association to one SkillTaxonomy;
    skill_level    : Integer; 
}

entity Notification : cuid, managed {
    user_account     : Association to one UserAccount @mandatory;
    title            : String(200) @mandatory;
    message          : String(1000) @mandatory;
    notification_type : String(50); 
    is_read          : Boolean default false;
    priority         : String(20) default 'NORMAL'; 
    action_url       : String(500);
    expires_at       : DateTime;
}

entity EmailTemplate : cuid, managed {
    template_name : String(100) @mandatory;
    subject       : String(200) @mandatory;
    body_template : LargeString @mandatory;
    template_type : String(50); 
    is_active     : Boolean default true;
    variables     : String(1000); 
}


entity HiringMetrics : cuid, managed {
    company           : Association to one Company @mandatory;
    job_post          : Association to one JobPost;
    metric_date       : Date @mandatory;
    total_applications : Integer default 0;
    screened_candidates : Integer default 0;
    interviewed_candidates : Integer default 0;
    hired_candidates  : Integer default 0;
    average_time_to_hire : Decimal(5,2); // in days
    cost_per_hire     : Decimal(10,2);
    source_quality_score : Decimal(5,2);
}

entity DiversityMetrics : cuid, managed {
    company        : Association to one Company @mandatory;
    reporting_period : String(20); // MONTHLY, QUARTERLY, YEARLY
    period_start   : Date @mandatory;
    period_end     : Date @mandatory;
    gender_distribution : String(500); // JSON object
    age_distribution    : String(500); // JSON object
    location_distribution : String(500); // JSON object
    education_distribution : String(500); // JSON object
}


view CandidateMatchView as select from SeekerProfile {
    key ID,
    first_name,
    last_name,
    current_salary,
    currency,
    user_account.email,
    user_account.phone,
    user_account.is_active
} where user_account.is_active = true;

view JobPostSummaryView as select from JobPost {
    key ID,
    job_title,
    company.company_name,
    job_location.city,
    job_location.state,
    salary_min,
    salary_max,
    createdAt,
    is_active,
    application_deadline
} where is_active = true;

view TopCandidatesView as select from AIScreeningResult {
    key ID,
    job_post.job_title,
    seeker_profile.first_name,
    seeker_profile.last_name,
    overall_match_score,
    skills_match_score,
    screening_date,
    confidence_level
} where overall_match_score >= 70
order by overall_match_score desc;