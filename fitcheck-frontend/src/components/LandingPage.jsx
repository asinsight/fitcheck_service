import React from 'react';
import { SignUpButton, SignInButton } from "@clerk/clerk-react";
import { motion } from 'framer-motion';
import { Zap, Brain, ShieldCheck, ArrowRight, CheckCircle } from 'lucide-react';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-lime-400/30 overflow-hidden relative">
            {/* Background Glow Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-lime-400/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="max-w-6xl mx-auto px-6 relative z-10">
                {/* Header / Nav */}
                <header className="py-8 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-lime-400 rounded-lg rotate-3 flex items-center justify-center">
                            <CheckCircle className="text-slate-900 w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">FitCheck</span>
                    </div>
                    <SignInButton mode="modal">
                        <button className="text-sm font-medium text-slate-400 hover:text-lime-400 transition-colors">
                            Sign In
                        </button>
                    </SignInButton>
                </header>

                {/* Hero Section */}
                <main className="mt-16 md:mt-24 text-center max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
                            Is Your Resume a <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">
                                Perfect Fit?
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Just paste the Job URL. AI analyzes your match score and reveals the <span className="text-lime-400 font-medium">cheat codes</span> to get hired.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <SignUpButton mode="modal">
                                <button className="px-8 py-4 bg-lime-400 text-slate-900 font-bold rounded-xl text-lg hover:bg-lime-300 hover:scale-105 transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)] flex items-center gap-2 group">
                                    Start Free Analysis
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </SignUpButton>
                            <SignInButton mode="modal">
                                <button className="px-8 py-4 bg-slate-800 text-slate-200 font-medium rounded-xl text-lg hover:bg-slate-700 transition-all border border-slate-700 hover:border-slate-600">
                                    I have an account
                                </button>
                            </SignInButton>
                        </div>
                    </motion.div>

                    {/* Features Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="grid md:grid-cols-3 gap-6 mt-24 text-left"
                    >
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-lime-400" />}
                            title="Lightning Fast"
                            desc="30-second analysis. No waiting. Get instant feedback on your resume."
                        />
                        <FeatureCard
                            icon={<Brain className="w-6 h-6 text-lime-400" />}
                            title="AI Recruiter"
                            desc="See your resume through a recruiter's eyes. We score your fit objectively."
                        />
                        <FeatureCard
                            icon={<ShieldCheck className="w-6 h-6 text-lime-400" />}
                            title="Hiring Cheat Codes"
                            desc="Get actionable advice and specific keywords to boost your fit score."
                        />
                    </motion.div>
                </main>

                {/* Footer */}
                <footer className="mt-24 py-8 text-center text-slate-600 text-sm">
                    <p>© {new Date().getFullYear()} FitCheck. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-lime-400/30 hover:bg-slate-800 transition-all group">
        <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-slate-700 group-hover:border-lime-400/30">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
);

export default LandingPage;
