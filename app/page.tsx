"use client";

import { useState, useRef, createContext, useContext } from "react";
import { ClientMessage } from "@/lib/action";
import { useActions, useUIState } from "ai/rsc";
import { nanoid } from "nanoid";
import { CSVUploader } from "@/components/csv-uploader";
// import { SQLQueryDialog } from "./components/SQLQueryDialog";
import { ThemeToggle } from "@/components/theme-toggle";

// Create a context for the database
export const DbContext = createContext<{
    db: any;
    setDb: React.Dispatch<React.SetStateAction<any>>;
}>({
    db: null,
    setDb: () => {},
});

// Custom hook to use the DbContext
const useDbContext = () => useContext(DbContext);



const generateTableMetadata = (tableName: string, columns: string[]) => {
    return `Table name: ${tableName}
        Columns: ${columns.join(', ')}
        Instructions:
        1. Use only this table name and these columns in your SQL queries.
        2. Interpret column names based on their likely meaning in the context of the data.
        3. When asked about data without specifics, use the most relevant column(s) based on the question.
        4. Format your responses using proper SQL syntax.
        5. If a query cannot be answered with the available columns, explain why.`
}


export default function Home() {
    const [input, setInput] = useState<string>("what's the average price per decade? not years but decades");
    const [conversation, setConversation] = useUIState();
    const { continueConversation, updateSystemPrompt } = useActions();
    const [db, setDb] = useState<any>(null);
    const dbInfoSent = useRef(false);
    const [tableMetadata, setTableMetadata] = useState<string>('');

    return (
        <DbContext.Provider value={{ db, setDb }}>
            <div className="absolute top-0 right-0"><ThemeToggle/></div>
            <div className="bg-background text-foreground h-full w-full overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {conversation.map((message: ClientMessage) => (
                        <div key={message.id} className="bg-card text-card-foreground p-4 rounded-md">
                            <span className="font-bold">{message.role}:</span> {message.display}
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-secondary">
                    <div className="flex flex-col space-y-2 mb-2">
                        <div className="flex space-x-2">
                            <CSVUploader 
                                db={db} 
                                onSetDb={(newDb: any) => {
                                    console.log('setting db', newDb);
                                    setDb(newDb);
                                    const tableResult = newDb.exec("SELECT name FROM sqlite_master WHERE type='table'");
                                    const originalTableName = tableResult[0]?.values[0]?.[0];
                                    console.log('original table name', originalTableName);
                                    if (originalTableName) {
                                        // Rename the table in the database
                                        newDb.run(`ALTER TABLE ${originalTableName} RENAME TO my_table`);
                                        
                                        const tableName = "my_table";
                                        const columnResult = newDb.exec(`PRAGMA table_info(${tableName})`);
                                        const columns = columnResult[0]?.values.map((row: any[]) => row[1]) || [];
                                        setTableMetadata(generateTableMetadata(tableName, columns));

                                        const tableInfo = {
                                            tableName,
                                            columns
                                        };
                                        updateSystemPrompt(tableInfo);
                                        dbInfoSent.current = true;
                                    }
                                }}
                            />
                            {/* {db && <SQLQueryDialog />} */}
                        </div>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                setInput("");
                                const userRequest = input + "--THISISTHEBREAKER--" + `tableMetadata: ${JSON.stringify(tableMetadata)}`;
                                setConversation((currentConversation: ClientMessage[]) => [
                                    ...currentConversation,
                                    { id: nanoid(), role: "user", display: userRequest },
                                ]);
                                const message = await continueConversation(userRequest);
                                setConversation((currentConversation: ClientMessage[]) => [
                                    ...currentConversation,
                                    message,
                                ]);
                            }}
                            className="flex space-x-2"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(event) => { 
                                    setInput(event.target.value);
                                }}
                                onKeyPress={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        event.currentTarget.form?.requestSubmit();
                                    }
                                }}
                                className="bg-input text-foreground border border-border rounded-md p-2 flex-grow"
                            />
                            <button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md p-2">
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </DbContext.Provider>
    );
}
