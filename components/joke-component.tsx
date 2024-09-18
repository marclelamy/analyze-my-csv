"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Joke } from "@/lib/types/schema";

export const JokeComponent = ({ joke }: { joke?: Joke }) => {
    const [showPunchline, setShowPunchline] = useState(false);
    return (
        <div className="bg-secondary p-4 rounded-md m-4 max-w-prose flex items-center justify-between">
            <p className="text-secondary-foreground">
                {showPunchline ? joke?.punchline : joke?.setup}
            </p>
            <Button
                onClick={() => setShowPunchline(true)}
                disabled={showPunchline}
                variant="outline"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
                Show Punchline!
            </Button>
        </div>
    );
};
