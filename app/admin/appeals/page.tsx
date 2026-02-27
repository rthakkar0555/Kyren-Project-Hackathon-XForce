import { createClient as createGlobalClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ShieldCheck, ShieldX, Mail, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { approveAppeal, rejectAppeal } from '../actions'

export default async function AppealsPage() {
    const supabaseAdmin = createGlobalClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // Fetch all appeals
    const { data: appeals } = await supabaseAdmin
        .from('ban_appeals')
        .select('*')
        .order('created_at', { ascending: false })

    // Get counts by status
    const pendingCount = appeals?.filter(a => a.status === 'pending').length || 0
    const approvedCount = appeals?.filter(a => a.status === 'approved').length || 0
    const rejectedCount = appeals?.filter(a => a.status === 'rejected').length || 0

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="px-8 py-6 flex items-center justify-between max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-3xl font-bold">Ban Appeals</h1>
                        <p className="text-muted-foreground">Review and manage user unban requests</p>
                    </div>
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 h-10 px-4 py-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Admin
                    </Link>
                </div>
            </header>

            <main className="p-8 space-y-6 max-w-7xl mx-auto">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-t-4 border-t-yellow-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Appeals</CardTitle>
                            <Clock className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{pendingCount}</div>
                            <p className="text-xs text-muted-foreground">Awaiting review</p>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-green-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Approved</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{approvedCount}</div>
                            <p className="text-xs text-muted-foreground">Users unbanned</p>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-red-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                            <XCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{rejectedCount}</div>
                            <p className="text-xs text-muted-foreground">Appeals denied</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Appeals Table */}
                <Card className="border-2 border-border">
                    <CardHeader>
                        <CardTitle>All Appeals</CardTitle>
                        <CardDescription>Review user requests to be unbanned</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border-2 border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-border">
                                        <TableHead className="font-bold">User</TableHead>
                                        <TableHead className="font-bold">Appeal Reason</TableHead>
                                        <TableHead className="font-bold">Status</TableHead>
                                        <TableHead className="font-bold">Submitted</TableHead>
                                        <TableHead className="font-bold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!appeals || appeals.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                No appeals submitted yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        appeals.map((appeal) => (
                                            <TableRow key={appeal.id} className="border-b border-border">
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{appeal.user_email}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            {appeal.user_id.split('-')[0]}...
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-md">
                                                    <p className="text-sm line-clamp-2">{appeal.appeal_reason}</p>
                                                </TableCell>
                                                <TableCell>
                                                    {appeal.status === 'pending' && (
                                                        <Badge className="bg-yellow-500">Pending</Badge>
                                                    )}
                                                    {appeal.status === 'approved' && (
                                                        <Badge className="bg-green-500">Approved</Badge>
                                                    )}
                                                    {appeal.status === 'rejected' && (
                                                        <Badge className="bg-red-500">Rejected</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(appeal.created_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {appeal.status === 'pending' ? (
                                                        <div className="flex gap-2 justify-end">
                                                            <form action={approveAppeal}>
                                                                <input type="hidden" name="appealId" value={appeal.id} />
                                                                <input type="hidden" name="userId" value={appeal.user_id} />
                                                                <Button
                                                                    type="submit"
                                                                    size="sm"
                                                                    className="h-8 bg-green-600 hover:bg-green-700"
                                                                >
                                                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                                                    Approve
                                                                </Button>
                                                            </form>
                                                            <form action={rejectAppeal}>
                                                                <input type="hidden" name="appealId" value={appeal.id} />
                                                                <Button
                                                                    type="submit"
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    className="h-8"
                                                                >
                                                                    <ShieldX className="h-3 w-3 mr-1" />
                                                                    Reject
                                                                </Button>
                                                            </form>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            {appeal.status === 'approved' ? 'Unbanned' : 'Denied'}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
