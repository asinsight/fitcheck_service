import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Loader2, Link as LinkIcon, X } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserButton, useAuth, useClerk } from '@clerk/clerk-react';

// --- Utility for Tailwind classes ---
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---
const LAMBDA_URL = "https://x6hfhamopq5yrrfh2f5pbt3ssq0zkziv.lambda-url.us-east-1.on.aws/";
const LOADING_MESSAGES = [
  "Connecting to LinkedIn...",
  "Analyzing Resume Structure...",
  "Generating Virtual Candidate...",
  "Calculating Fit Score...",
  "Drafting Career Advice..."
];

// --- Types ---
interface Breakdown {
  hard_skills: number;
  experience: number;
  soft_skills: number;
  education: number;
  [key: string]: number;
}

interface AdviceItem {
  title: string;
  content: string;
}

interface AnalysisResult {
  score: number;
  breakdown: Breakdown;
  strengths: string[];
  weaknesses: string[];
  advice: AdviceItem[];
}

// --- Helper: Parse HTML Response ---
const parseHtmlResponse = (html: string): AnalysisResult => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract Score
  const scoreText = doc.querySelector('.percentage-text strong')?.textContent || "0";
  const score = parseFloat(scoreText.replace(/[^0-9.]/g, ''));

  // Extract Breakdown Scores
  const getScore = (category: string) => {
    const el = doc.querySelector(`.score-value[data-category="${category}"]`);
    return el ? parseFloat(el.textContent || "0") : 0;
  };

  const breakdown: Breakdown = {
    hard_skills: getScore('hard_skills'),
    experience: getScore('experience'),
    soft_skills: getScore('soft_skills'),
    education: getScore('education')
  };

  // Extract Strengths
  const strengths = Array.from(doc.querySelectorAll('.strengths .card-item')).map(el => el.textContent?.trim() || "");

  // Extract Weaknesses
  const weaknesses = Array.from(doc.querySelectorAll('.weaknesses .card-item')).map(el => el.textContent?.trim() || "");

  // Extract Advice
  const advice = Array.from(doc.querySelectorAll('.advice-list li')).map(el => {
    // The template has <strong>Title</strong> Content
    const strong = el.querySelector('strong');
    const title = strong?.textContent || "Advice";

    // Get text content excluding the title
    let content = el.textContent?.trim() || "";
    if (strong && strong.textContent) {
      content = content.replace(strong.textContent, '').trim();
    }

    return { title, content };
  });

  return { score, breakdown, strengths, weaknesses, advice };
};

// --- Components ---

interface BreakdownChartProps {
  breakdown: Breakdown;
}

const BreakdownChart: React.FC<BreakdownChartProps> = ({ breakdown }) => {
  const items = [
    { label: "Hard Skills", key: "hard_skills", color: "bg-blue-500" },
    { label: "Experience", key: "experience", color: "bg-emerald-500" },
    { label: "Soft Skills", key: "soft_skills", color: "bg-amber-500" },
    { label: "Education", key: "education", color: "bg-violet-500" }
  ];

  return (
    <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-6">Detailed Breakdown</h3>
      <div className="space-y-5">
        {items.map((item) => (
          <div key={item.key}>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300 font-medium">{item.label}</span>
              <span className="text-white font-bold">{breakdown[item.key]}%</span>
            </div>
            <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${breakdown[item.key]}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                className={cn("h-full rounded-full", item.color)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Header: React.FC = () => {
  const { signOut } = useClerk();
  return (
    <header className="w-full py-8 relative flex items-center justify-center">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-4 bg-slate-800 p-2 rounded-lg border border-slate-700">
        <button
          onClick={() => signOut()}
          className="text-sm text-red-400 hover:text-red-300 font-bold"
        >
          FORCE SIGN OUT
        </button>
        <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'ring-2 ring-lime-400/70' } }} />
      </div>
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 mb-2"
        >
          <div className="w-8 h-8 bg-lime-400 rounded-lg rotate-3 flex items-center justify-center">
            <CheckCircle className="text-slate-900 w-5 h-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">FitCheck</h1>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 font-light"
        >
          Check your career fit instantly
        </motion.p>
      </div>
    </header>
  );
};

interface FileUploadProps {
  file: File | null;
  setFile: (file: File | null) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ file, setFile }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.type === "application/pdf") {
      setFile(file);
    } else {
      alert("Please upload a PDF file.");
    }
  };

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 text-center cursor-pointer group",
        isDragging ? "border-lime-400 bg-slate-800/50" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/30",
        file ? "bg-slate-800/50 border-lime-400/50" : ""
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="application/pdf"
        onChange={handleChange}
      />

      {file ? (
        <div className="flex flex-col items-center gap-2">
          <FileText className="w-10 h-10 text-lime-400" />
          <p className="text-white font-medium">{file.name}</p>
          <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <button
            onClick={(e) => { e.stopPropagation(); setFile(null); }}
            className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6 text-slate-400 group-hover:text-lime-400" />
          </div>
          <div>
            <p className="text-slate-300 font-medium">Click to upload or drag and drop</p>
            <p className="text-xs text-slate-500 mt-1">PDF only (Max 10MB)</p>
          </div>
        </div>
      )}
    </div>
  );
};

interface ScoreGaugeProps {
  score: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const circumference = 2 * Math.PI * 45; // radius 45
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background Circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#1e293b"
          strokeWidth="8"
        />
        {/* Progress Circle */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={score > 70 ? "#a3e635" : score > 40 ? "#facc15" : "#f87171"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-4xl font-bold text-white"
        >
          {score.toFixed(0)}
        </motion.span>
        <span className="text-xs text-slate-400 uppercase tracking-wider mt-1">Fit Score</span>
      </div>
    </div>
  );
};

interface AdviceAccordionProps {
  items: AdviceItem[];
}

const AdviceAccordion: React.FC<AdviceAccordionProps> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50">
          <button
            onClick={() => setOpenIndex(openIndex === idx ? -1 : idx)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800 transition-colors"
          >
            <span className="font-medium text-slate-200 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-700 text-xs flex items-center justify-center text-lime-400 font-bold">
                {idx + 1}
              </span>
              {item.title}
            </span>
            {openIndex === idx ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          <AnimatePresence>
            {openIndex === idx && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-0 text-slate-400 text-sm leading-relaxed pl-[3.25rem]">
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

// --- Main App Component ---

function App() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const { redirectToSignIn } = useClerk();

  // Debug: Log authentication state on every render
  console.log('[DEBUG] Auth State:', { isLoaded, isSignedIn, userId, hasUserId: !!userId });

  useEffect(() => {
    console.log('[DEBUG] useEffect triggered:', { isLoaded, isSignedIn });
    if (isLoaded && !isSignedIn) {
      console.log('[DEBUG] Redirecting to sign in...');
      redirectToSignIn();
    } else if (isLoaded && isSignedIn) {
      console.log('[DEBUG] User is signed in, userId:', userId);
    }
  }, [isLoaded, isSignedIn, redirectToSignIn, userId]);

  const [url, setUrl] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState<number>(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rotate loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    } else {
      setLoadingMsgIndex(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleAnalyze = async () => {
    if (!url || !file) {
      setError("Please provide both a LinkedIn URL and a CV PDF.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Unable to retrieve session token.");
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        try {
          if (typeof reader.result !== 'string') throw new Error("Failed to read file");
          const base64String = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix

          const response = await fetch(LAMBDA_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-fitcheck-auth': import.meta.env.VITE_LAMBDA_KEY || '',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              job_url: url,
              cv_pdf: base64String
            })
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Analysis failed with status ${response.status}`);
          }

          const html = await response.text();
          const data = parseHtmlResponse(html);
          setResult(data);

        } catch (err: any) {
          console.error(err);
          setError(err.message || "An unexpected error occurred.");
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setError("Failed to read file.");
        setIsLoading(false);
      };

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          padding: '40px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          background: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ marginBottom: '10px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>FitCheck</h1>
          <p style={{ marginBottom: '30px', color: '#666', textAlign: 'center' }}>Please sign in to continue</p>
          <button
            onClick={() => redirectToSignIn()}
            style={{
              width: '100%',
              padding: '12px',
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#333'}
            onMouseOut={(e) => e.currentTarget.style.background = '#000'}
          >
            Sign In with Clerk
          </button>
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
            Debug: isLoaded = {String(isLoaded)}, isSignedIn = {String(isSignedIn)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-lime-400/30">
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <Header />

        {/* Input Section */}
        <motion.div
          className="space-y-6 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10 py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="space-y-4">
            {/* URL Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="url"
                placeholder="Paste LinkedIn Job URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
              />
            </div>

            {/* File Upload */}
            <FileUpload file={file} setFile={setFile} />

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2 text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !url || !file}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-lime-900/20",
                isLoading
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-lime-400 text-slate-900 hover:bg-lime-300 hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                "Analyze Fit"
              )}
            </button>
          </div>
        </motion.div>

        {/* Loading Overlay / Message */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex flex-col items-center justify-center"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-700 border-t-lime-400 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-lime-400/20 rounded-full animate-pulse"></div>
                </div>
              </div>
              <motion.p
                key={loadingMsgIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 text-lg font-medium text-lime-400"
              >
                {LOADING_MESSAGES[loadingMsgIndex]}
              </motion.p>
              <p className="text-slate-500 text-sm mt-2">This may take 20-40 seconds</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {result && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 space-y-12"
            >
              {/* Score Section */}
              <div className="text-center">
                <ScoreGauge score={result.score} />
              </div>

              {/* Breakdown Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <BreakdownChart breakdown={result.breakdown} />
              </motion.div>

              {/* Virtual Persona / Analysis */}
              <div className="grid md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/50"
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-lime-400 rounded-full"></span>
                    Why You Fit
                  </h3>
                  <ul className="space-y-3">
                    {result.strengths.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                        <CheckCircle className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/50"
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-red-400 rounded-full"></span>
                    Missing Pieces
                  </h3>
                  <ul className="space-y-3">
                    {result.weaknesses.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              {/* Advice Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-xl font-bold text-white mb-6 text-center">Consulting Advice</h3>
                <AdviceAccordion items={result.advice} />
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
