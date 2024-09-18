"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import initSqlJs from "sql.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Component for uploading CSV files and previewing data
export const CSVUploader = ({ db, onSetDb }: { db: any, onSetDb: (db: any) => void }) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [localDb, setLocalDb] = useState<any>(null);

    // Initialize SQL.js
    useEffect(() => {
        initSqlJs({
            locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
        })
            .then((SQL: any) => setLocalDb(new SQL.Database()))
            .catch((err: Error) => setError(err.message));
    }, []);

    // Function to store CSV in SQL.js database
    const storeCSV = useCallback(async (file: File) => {
        if (!localDb) {
            setError("Database not initialized");
            return;
        }

        try {
            // Read the file content
            const fileContent = await file.text();

            // Create a table and insert the CSV data
            const tableName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
            const lines = fileContent.split('\n');
            const headers = lines[0].split(',').map(header => header.trim());

            // Create table
            localDb.run(`CREATE TABLE ${tableName} (${headers.map(h => `${h} TEXT`).join(', ')})`);

            // Insert data
            const stmt = localDb.prepare(`INSERT INTO ${tableName} VALUES (${headers.map(() => '?').join(', ')})`);
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(value => value.trim());
                stmt.run(values);
            }
            stmt.free();

            // Update the file name state
            setFileName(file.name);

            // Inform the user that the file has been uploaded
            // alert(`CSV file "${file.name}" has been successfully uploaded and stored.`);
            
            // Call onSetDb with the updated database
            onSetDb(localDb);

            // Automatically show preview after successful upload
            setShowPreview(true);
        } catch (err: unknown) {
            setError((err as Error).message);
        }
    }, [localDb, onSetDb]);

    // Handle file selection
    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === "text/csv") {
            storeCSV(file);
        } else {
            setError("Please select a valid CSV file.");
        }
    }, [storeCSV]);

    return (
        <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-4">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-upload"
                />
                <Button
                    onClick={(e) => {
                        e.preventDefault();
                        document.getElementById("csv-upload")?.click();
                    }}
                    variant="outline"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    Upload CSV
                </Button>
                <Button
                    onClick={(e) => {
                        e.preventDefault()
                        setShowPreview(!showPreview)
                    }}
                    variant="outline"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                    {showPreview ? "Hide Preview" : "Show Preview"}
                </Button>
            </div>
            {fileName && (
                <p className="text-muted-foreground">
                    Uploaded file: {fileName}
                </p>
            )}
            {error && (
                <p className="text-destructive">
                    Error: {error}
                </p>
            )}
            {/* {showPreview && <CSVViewer db={localDb} />} */}
        </div>
    );
};

// // Component for viewing CSV data
// const CSVViewer = ({ db }: { db: any }) => {
//     const [tables, setTables] = useState<string[]>([]);
//     const [selectedTable, setSelectedTable] = useState<string | null>(null);
//     const [tableData, setTableData] = useState<any>({});
//     const [query, setQuery] = useState<string>('');

//     // Fetch table names
//     useEffect(() => {
//         if (db) {
//             const result = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
//             if (result.length > 0) {
//                 const tableNames = result[0].values.map((row: any) => row[0]);
//                 setTables(tableNames);
//                 if (tableNames.length > 0) {
//                     setSelectedTable(tableNames[0]);
//                 }
//             }
//         }
//     }, [db]);

//     // Fetch table data when a table is selected
//     useEffect(() => {
//         if (selectedTable && db) {
//             const defaultQuery = `SELECT * FROM ${selectedTable} LIMIT 6`;
//             setQuery(defaultQuery);
//             executeQuery(defaultQuery);
//         }
//     }, [selectedTable, db]);

//     // Function to execute the SQL query
//     const executeQuery = (sql: string) => {
//         if (db) {
//             try {
//                 const result = db.exec(sql);
//                 if (result.length > 0) {
//                     setTableData(result[0]);
//                 } else {
//                     setTableData({});
//                 }
//             } catch (error) {
//                 console.error('Error executing query:', error);
//                 setTableData({});
//             }
//         }
//     };

//     return (
//         <div className="mt-8 space-y-4">
//             {tables.length > 0 && (
//                 <Select value={selectedTable || undefined} onValueChange={(value) => setSelectedTable(value)}>
//                     <SelectTrigger className="w-[200px]">
//                         <SelectValue placeholder="Select a table" />
//                     </SelectTrigger>
//                     <SelectContent>
//                         {tables.map((table) => (
//                             <SelectItem key={table} value={table}>
//                                 {table}
//                             </SelectItem>
//                         ))}
//                     </SelectContent>
//                 </Select>
//             )}

//             <div className="flex items-center space-x-2">
//                 <input
//                     type="text"
//                     value={query}
//                     onChange={(e) => setQuery(e.target.value)}
//                     className="flex-grow p-2 border border-input rounded-md"
//                     placeholder="Enter SQL query"
//                 />
//                 <Button
//                     onClick={() => executeQuery(query)}
//                     variant="outline"
//                     className="bg-primary text-primary-foreground hover:bg-primary/90"
//                 >
//                     Execute
//                 </Button>
//             </div>

//             {tableData.columns && tableData.values && (
//                 <Table>
//                     <TableHeader>
//                         <TableRow>
//                             {tableData.columns.map((header: string, index: number) => (
//                                 <TableHead key={index}>{header}</TableHead>
//                             ))}
//                         </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                         {tableData.values.map((row: any[], rowIndex: number) => (
//                             <TableRow key={rowIndex}>
//                                 {row.map((cell, cellIndex) => (
//                                     <TableCell key={cellIndex}>{cell}</TableCell>
//                                 ))}
//                             </TableRow>
//                         ))}
//                     </TableBody>
//                 </Table>
//             )}
//         </div>
//     );
// };