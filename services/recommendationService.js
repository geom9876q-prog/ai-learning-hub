const db = require("../config/db");

async function getNextRecommendation(userId) {

    // 1. Check for weak quiz performance
           const weakResult = await db.query(
    `SELECT
        lessons.id AS lesson_id,
        lessons.title AS lesson_title,
        ROUND(
            (quiz_attempts.score::DECIMAL /
             quiz_attempts.total_questions) * 100
        ) AS percentage
     FROM quiz_attempts
     JOIN quizzes
     ON quiz_attempts.quiz_id = quizzes.id
     JOIN lessons
     ON quizzes.lesson_id = lessons.id
     WHERE quiz_attempts.user_id = $1
     AND quiz_attempts.id = (
         SELECT qa.id
         FROM quiz_attempts qa
         WHERE qa.user_id = $1
         AND qa.quiz_id = quiz_attempts.quiz_id
         ORDER BY qa.attempted_at DESC
         LIMIT 1
     )
     AND (
         quiz_attempts.score::DECIMAL /
         quiz_attempts.total_questions
     ) < 0.60
     ORDER BY percentage ASC
     LIMIT 1`,
    [userId]
);

    // 2. Weak quiz → recovery
    if (weakResult.rows.length > 0) {

        const weakLesson = weakResult.rows[0];

        return {
            type: "recovery",
            lesson_id: weakLesson.lesson_id,
            lesson_title: weakLesson.lesson_title,
            reason: `Your quiz score was ${weakLesson.percentage}%. You should review this topic.`
        };
    }

    // 3. Check retention results
    const retentionResult = await db.query(
        `SELECT
            lessons.id AS lesson_id,
            lessons.title AS lesson_title,
            retention_checks.score,
            retention_checks.total_questions,
            ROUND(
                (retention_checks.score::DECIMAL /
                 retention_checks.total_questions) * 100
            ) AS percentage
         FROM retention_checks
         JOIN lessons
         ON retention_checks.lesson_id = lessons.id
         WHERE retention_checks.user_id = $1
         AND retention_checks.score < retention_checks.total_questions
         ORDER BY percentage ASC
         LIMIT 1`,
        [userId]
    );

    // 4. Retention issue → revision/recovery
    if (retentionResult.rows.length > 0) {

        const retentionLesson = retentionResult.rows[0];

        const type =
            retentionLesson.score === 2
                ? "light_revision"
                : "retention_recovery";

        const reason =
            retentionLesson.score === 2
                ? "You retained most of this topic, but a short revision would help."
                : `Your retention check score was ${retentionLesson.percentage}%. You should review this topic.`;

        return {
            type: type,
            lesson_id: retentionLesson.lesson_id,
            lesson_title: retentionLesson.lesson_title,
            reason: reason
        };
    }

    // 5. No weakness → find next incomplete lesson
    const lessonsResult = await db.query(
        `SELECT
            lessons.id AS lesson_id,
            lessons.title AS lesson_title,
            lessons.description AS lesson_description,
            lessons.lesson_order,
            courses.id AS course_id,
            courses.title AS course_title
         FROM enrollments
         JOIN courses
         ON enrollments.course_id = courses.id
         JOIN lessons
         ON courses.id = lessons.course_id
         LEFT JOIN lesson_completions
         ON lessons.id = lesson_completions.lesson_id
         AND lesson_completions.user_id = $1
         WHERE enrollments.user_id = $1
         AND lesson_completions.id IS NULL
         ORDER BY courses.id, lessons.lesson_order`,
        [userId]
    );

    // 6. Everything completed
    if (lessonsResult.rows.length === 0) {
        return null;
    }

    // 7. Return next incomplete lesson
    const recommendation = lessonsResult.rows[0];

    return {
        type: "next_lesson",
        lesson_id: recommendation.lesson_id,
        lesson_title: recommendation.lesson_title,
        lesson_description: recommendation.lesson_description,
        course_id: recommendation.course_id,
        course_title: recommendation.course_title
    };
}

module.exports = {
    getNextRecommendation
};