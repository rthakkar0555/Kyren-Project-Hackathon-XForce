"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Sparkles, Trophy, Infinity as InfinityIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Minimax Algorithm for Unbeatable AI
const calculateBestMove = (squares: (string | null)[], player: string): number => {
    const opponent = player === "X" ? "O" : "X"

    const minimax = (board: (string | null)[], isMaximizing: boolean): number => {
        const winner = calculateWinner(board)
        if (winner === player) return -10
        if (winner === opponent) return 10
        if (board.every(square => square !== null)) return 0

        if (isMaximizing) {
            let bestScore = -Infinity
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = opponent
                    const score = minimax(board, false)
                    board[i] = null
                    bestScore = Math.max(score, bestScore)
                }
            }
            return bestScore
        } else {
            let bestScore = Infinity
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = player
                    const score = minimax(board, true)
                    board[i] = null
                    bestScore = Math.min(score, bestScore)
                }
            }
            return bestScore
        }
    }

    let bestScore = -Infinity
    let move = -1

    // Optimization: First move center if available
    if (squares[4] === null) return 4

    for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
            squares[i] = opponent
            const score = minimax(squares, false)
            squares[i] = null
            if (score > bestScore) {
                bestScore = score
                move = i
            }
        }
    }
    return move
}

const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ]
    for (const [a, b, c] of lines) {
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a]
        }
    }
    return null
}

export function TicTacToeGame() {
    const [squares, setSquares] = useState<(string | null)[]>(Array(9).fill(null))
    const [isPlayerTurn, setIsPlayerTurn] = useState(true) // Player is always X and goes first
    const [timer, setTimer] = useState(0)
    const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost" | "draw">("playing")
    const [winningLine, setWinningLine] = useState<number[] | null>(null)

    // Timer effect
    useEffect(() => {
        if (gameStatus === "playing") {
            const interval = setInterval(() => setTimer(t => t + 1), 1000)
            return () => clearInterval(interval)
        }
    }, [gameStatus])

    // AI Turn
    useEffect(() => {
        if (!isPlayerTurn && gameStatus === "playing") {
            const timeOutId = setTimeout(() => {
                const nextMove = calculateBestMove([...squares], "X") // AI is O, Player is X
                if (nextMove !== -1) {
                    handleClick(nextMove, false)
                }
            }, 600) // Slight delay for realism
            return () => clearTimeout(timeOutId)
        }
    }, [isPlayerTurn, gameStatus, squares])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const handleClick = useCallback((i: number, isHuman: boolean) => {
        if (squares[i] || gameStatus !== "playing") return
        if (isHuman && !isPlayerTurn) return

        const newSquares = [...squares]
        newSquares[i] = isHuman ? "X" : "O"
        setSquares(newSquares)

        // Check Win/Draw
        const winner = calculateWinner(newSquares)
        const isDraw = newSquares.every(s => s !== null)

        if (winner) {
            setGameStatus(winner === "X" ? "won" : "lost")
            // Find winning line for visual
            const lines = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6],
            ]
            const line = lines.find(([a, b, c]) => newSquares[a] === winner && newSquares[b] === winner && newSquares[c] === winner)
            setWinningLine(line || null)
        } else if (isDraw) {
            setGameStatus("draw")
        } else {
            setIsPlayerTurn(!isHuman)
        }
    }, [squares, gameStatus, isPlayerTurn])

    const resetGame = () => {
        setSquares(Array(9).fill(null))
        setIsPlayerTurn(true)
        setGameStatus("playing")
        setWinningLine(null)
        setTimer(0)
    }

    return (
        <div className="w-full h-full min-h-[500px] flex flex-col bg-background relative overflow-hidden font-sans select-none border-4 border-border shadow-md">
            {/* Header - Site Theme */}
            <div className="p-4 flex justify-between items-start bg-secondary border-b-4 border-border z-10">
                <div>
                    <h2 className="text-2xl font-black tracking-wider uppercase text-secondary-foreground">Strategic Protocol</h2>
                    <p className="text-sm font-mono font-bold text-secondary-foreground/80">AI Complexity: Maximum</p>
                </div>
                {/* Visual decoration */}
                <Sparkles className="h-6 w-6 text-foreground animate-pulse" />
            </div>

            {/* Main Game Area */}
            <div className="flex-1 flex items-center justify-center relative z-10 p-4 bg-accent/20">
                <div className="relative bg-card p-4 border-4 border-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="grid grid-cols-3 gap-3">
                        {squares.map((square, i) => (
                            <button
                                key={i}
                                onClick={() => handleClick(i, true)}
                                disabled={!!square || !isPlayerTurn || gameStatus !== "playing"}
                                className={cn(
                                    "w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center text-5xl font-black transition-all duration-150 border-2 border-border bg-background hover:bg-yellow-200 active:translate-x-1 active:translate-y-1",
                                    square === "X" ? "bg-primary text-primary-foreground" :
                                        square === "O" ? "bg-accent text-accent-foreground" : "",
                                    winningLine?.includes(i) && "bg-green-400 animate-pulse"
                                )}
                            >
                                {square}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer - Site Theme */}
            <div className="bg-primary p-6 text-center text-primary-foreground relative z-20 border-t-4 border-border">
                <div className="relative z-10">
                    <div className="text-4xl font-mono font-bold tracking-tighter mb-1">
                        {formatTime(timer)}
                    </div>
                    <div className="text-xs font-bold tracking-[0.2em] uppercase opacity-80">
                        Session Duration
                    </div>
                </div>
            </div>

            {/* Overlays */}
            {gameStatus !== "playing" && (
                <div className="absolute inset-0 bg-background/90 z-50 flex items-center justify-center animate-in fade-in duration-300">
                    <Card className="max-w-[300px] w-full p-8 text-center border-4 border-border bg-card shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
                        <div className="mb-6 flex justify-center relative">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                            {gameStatus === "won" ? (
                                <Trophy className="h-16 w-16 text-yellow-500 animate-bounce relative z-10" />
                            ) : gameStatus === "lost" ? (
                                <div className="text-5xl animate-pulse relative z-10 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">🤖</div>
                            ) : (
                                <InfinityIcon className="h-16 w-16 text-indigo-500 animate-[spin_4s_linear_infinite] relative z-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                            )}
                        </div>

                        <h3 className="text-2xl font-black text-foreground mb-3 uppercase tracking-tight">
                            {gameStatus === "won" ? "Impossible!" :
                                gameStatus === "lost" ? "System Victory" : "Absolute Stalemate"}
                        </h3>

                        <p className="text-muted-foreground font-mono font-medium text-sm mb-8 border-y-2 border-dashed border-border py-4 bg-muted/30 px-2 rounded-sm italic">
                            {gameStatus === "won" ? "You defeated the unbreakable logic." :
                                gameStatus === "lost" ? "The AI anticipated your every move." :
                                    "Your intellect perfectly matched the machine. The equilibrium holds... but true mastery requires a victory. Dare to play again?"}
                        </p>

                        <Button
                            onClick={resetGame}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-black h-14 text-lg border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none rounded-none"
                        >
                            <RefreshCw className="mr-2 h-5 w-5 animate-spin-slow" /> Re-Initialize
                        </Button>
                    </Card>
                </div>
            )}
        </div>
    )
}
