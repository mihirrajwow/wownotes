import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import Resources from "./pages/Resources";
import Pricing from "./pages/Pricing";
import AdminUpload from "./pages/AdminUpload";
import AdminPanel from "./pages/AdminPanel";
import PDFViewer from "./pages/PDFViewer";
import PrivacyPolicy from "./pages/PrivacyPolicy";

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/onboarding"
                        element={
                            <ProtectedRoute>
                                <Onboarding />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/notes"
                        element={
                            <ProtectedRoute>
                                <Notes />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/resources"
                        element={
                            <ProtectedRoute>
                                <Resources />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/pricing"
                        element={
                            <ProtectedRoute>
                                <Pricing />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/upload"
                        element={
                            <ProtectedRoute>
                                <AdminUpload />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute>
                                <AdminPanel />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/view/:id"
                        element={
                            <ProtectedRoute>
                                <PDFViewer />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
