import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, getRoleDashboardPath } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Factory, Lock, User, AlertCircle } from "lucide-react";

const Login = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.user) {
      navigate(getRoleDashboardPath(auth.user.role), { replace: true });
    }
  }, [auth.user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const success = await auth.login(userId, password);
    setLoading(false);
    if (!success) {
      setError("Invalid User ID or password");
    }
  };

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
              <Factory className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Accura Precision</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Engineering Pvt. Ltd. — ERP System
            </p>
            <p className="text-xs text-muted-foreground">
              IMT Manesar, Sector-8, Gurugram, Haryana
            </p>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-foreground text-sm font-medium">
                  User ID or Email
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="userId"
                    placeholder="e.g. AccuraRajesh001 or admin@accura.in"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="pl-10 h-11 bg-muted border-0"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-muted border-0"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground font-semibold" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 p-3 rounded-lg bg-muted">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                Contact your Admin for login credentials
              </p>
              <p className="text-xs text-muted-foreground">
                All user accounts are created by the Administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
