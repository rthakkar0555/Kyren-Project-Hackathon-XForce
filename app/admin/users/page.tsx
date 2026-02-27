import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, is_admin, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border bg-card">
        <div className="p-8 max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon" className="border-2 border-border bg-transparent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">{users?.length || 0} total users</p>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle>User List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-border">
                  <tr>
                    <th className="text-left p-4 font-bold">Email</th>
                    <th className="text-left p-4 font-bold">Name</th>
                    <th className="text-left p-4 font-bold">Role</th>
                    <th className="text-left p-4 font-bold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-border">
                  {users?.map((user: any) => (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">{user.full_name || "—"}</td>
                      <td className="p-4">
                        {user.is_admin ? (
                          <Badge className="bg-primary text-primary-foreground border-primary">Admin</Badge>
                        ) : (
                          <Badge variant="outline" className="border-border">
                            User
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
