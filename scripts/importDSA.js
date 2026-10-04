const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const DSA_PATH = path.join(__dirname, "..", "data", "DSA");

const COURSE_ID = 7;

async function importFolder(folderPath, parentId = null) {

    const items = fs.readdirSync(folderPath, {
        withFileTypes: true
    });

    for (const item of items) {

        const fullPath = path.join(folderPath, item.name);

        // If it is a folder
        if (item.isDirectory()) {

            const result = await db.query(
                `INSERT INTO learning_items
                (course_id, parent_id, name, type)
                VALUES ($1, $2, $3, 'folder')
                RETURNING id`,
                [
                    COURSE_ID,
                    parentId,
                    item.name
                ]
            );

            const folderId = result.rows[0].id;

            console.log("Folder:", item.name);

            await importFolder(fullPath, folderId);
        }

        // If it is a DOCX file
        else if (item.isFile() && item.name.toLowerCase().endsWith(".docx")) {

            const relativePath = path
                .relative(process.cwd(), fullPath)
                .replace(/\\/g, "/");

            await db.query(
                `INSERT INTO learning_items
                (course_id, parent_id, name, type, file_path)
                VALUES ($1, $2, $3, 'document', $4)`,
                [
                    COURSE_ID,
                    parentId,
                    item.name,
                    relativePath
                ]
            );

            console.log("Document:", item.name);
        }
    }
}

async function startImport() {

    try {

        console.log("Starting DSA import...");

        await importFolder(DSA_PATH);

        console.log("DSA import completed successfully.");

    } catch (error) {

        console.error("Import failed:", error.message);

    } finally {

        await db.end();
    }
}

startImport();