import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import { io } from "socket.io-client";
import axios from "axios";

axios.defaults.withCredentials = true;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [forcedOut, setForcedOut] = useState(null);
    const [subs, setSubs] = useState([]); // active subscriptions
    const socketRef = useRef(null);

    const connectSocket = useCallback((userId) => {
        if (socketRef.current) socketRef.current.disconnect();
        const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || '', {
            auth: { userId },
            withCredentials: true,
        });
        socketRef.current = socket;
        socket.on("force_logout", ({ reason }) => {
            setForcedOut(reason);
            setUser(null);
        });
        socket.on("logged_out", () => setUser(null));
    }, []);

    const fetchSubs = useCallback(async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/subscriptions/mine`);
            setSubs(res.data);
        } catch {
            setSubs([]);
        }
    }, []);

    useEffect(() => {
        axios
            .get(`${import.meta.env.VITE_API_URL}/auth/me`)
            .then(({ data }) => {
                if (data.user) {
                    setUser(data.user);
                    connectSocket(data.user._id);
                    fetchSubs();
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        return () => socketRef.current?.disconnect();
    }, [connectSocket, fetchSubs]);

    // Helper: does user have access to a given course+semester?
    // Admins always have full access regardless of subscriptions.
    const hasAccess = useCallback(
        (course, semester) => {
            if (user?.role === "admin") return true;
            return subs.some((s) => {
                if (!s.isActive) return false;
                if (new Date() > new Date(s.expiresAt)) return false;
                if (s.course !== course) return false;
                if (s.pack === "full") return true;
                if (s.pack === "year")
                    return Math.ceil(semester / 2) === s.year;
                if (s.pack === "semester") return s.semester === semester;
                return false;
            });
        },
        [user, subs],
    );

    const logout = async () => {
        await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`);
        socketRef.current?.disconnect();
        setUser(null);
        setSubs([]);
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                forcedOut,
                setForcedOut,
                logout,
                subs,
                fetchSubs,
                hasAccess,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
