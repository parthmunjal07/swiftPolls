import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../ui/Button";
import { LogOut, BarChart2, PlusCircle, Moon, Sun } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <BarChart2 size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">SwiftPolls</span>
        </Link>

        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
            title="Toggle Theme"
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </Button>

          {isAuthenticated ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  Dashboard
                </Button>
              </Link>
              <Link to="/polls/create">
                <Button size="sm" className="hidden sm:flex">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Poll
                </Button>
              </Link>
              <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium hidden md:block">
                  {user?.name}
                </span>
                <Button variant="outline" size="icon" className="rounded-full" onClick={handleLogout}>
                  <LogOut size={18} />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
