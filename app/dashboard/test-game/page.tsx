import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TicTacToeGame } from "@/components/game/tic-tac-toe"
import { Gamepad2, Info } from "lucide-react"

export default function GameTestPage() {
  return (
    <div className="flex flex-col h-full space-y-6 pt-6 px-8 pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Game Environment Test</h1>
          <p className="text-muted-foreground text-sm">
            Internal testing sandbox for physics engine and score persistence.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/20">
          <Gamepad2 className="h-4 w-4" />
          DEV MODE ENABLED
        </div>
      </div>

      {/* Main Content Area - Game Wrapper */}
      <Card className="flex-1 flex flex-col overflow-hidden border-2 border-primary/20 shadow-xl bg-card">
        <CardHeader className="bg-muted/30 border-b border-border py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <Gamepad2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Interactive Neural Grid</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Info className="h-3 w-3" />
                Scores achieved here are saved to the production database.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 relative bg-zinc-100 dark:bg-zinc-950/50">
          {/* 
                We use a fixed aspect container centered to simulate the "flip card" size
                or let it fill the available space responsively. 
                The user asked for "not go outside layout". 
                The Card component handles the boundaries. 
             */}
          <div className="w-full h-full p-8 flex items-center justify-center">
            <div className="w-full max-w-5xl aspect-video shadow-2xl rounded-xl overflow-hidden border-4 border-zinc-200 dark:border-zinc-800">
              <TicTacToeGame />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
