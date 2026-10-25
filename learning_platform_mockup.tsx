import React, { useState, useEffect, useRef } from 'react';

// --- Icons (Inline SVGs to keep it single-file) ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const WandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-.813 2.846a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.428-1.428L13.5 18.75l1.178-.394a2.25 2.25 0 001.428-1.428l.394-1.183.394 1.183a2.25 2.25 0 001.428 1.428l1.183.394-1.183.394a2.25 2.25 0 00-1.428 1.428z" /></svg>;

// --- Mock Data ---
const TOTAL_DURATION = 291; // 4 minutes 51 seconds
const mockTranscript = [
  { time: 11, speaker: '王經理', text: '各位好，我們開始今天的會議。', color: 'text-blue-600' },
  { time: 14, speaker: '王經理', text: '今天主要確認會員系統改版的上線時程，還有測試進度。', color: 'text-blue-600' },
  { time: 19, speaker: '王經理', text: '陳工程師，先請你報告一下目前開發狀況。', color: 'text-blue-600' },
  { time: 25, speaker: '王經理', text: '好的，王經理。', color: 'text-blue-600' }, // Wireframe anomaly replicated
  { time: 27, speaker: '陳工程師', text: '目前會員登入、註冊跟個人資料這三個模組都已經開發完成，', color: 'text-orange-600' },
  { time: 33, speaker: '陳工程師', text: '程式碼也合併到主線了。', color: 'text-orange-600' },
  { time: 35, speaker: '陳工程師', text: '比較慢的是點數兌換的部分，大概完成70%。', color: 'text-orange-600' },
  { time: 42, speaker: '王經理', text: '點數兌換有遇到什麼技術瓶頸嗎？', color: 'text-blue-600' },
  { time: 48, speaker: '陳工程師', text: '主要是舊有資料庫的相容性問題，需要額外寫轉接層。', color: 'text-orange-600' },
  { time: 55, speaker: '林設計', text: '另外，前端的UI我也已經更新到最新版本了，待會可以看一下。', color: 'text-green-600' }
];

const mockWaveformData = Array.from({ length: 80 }, () => Math.random() * 0.8 + 0.2);

// --- Helper Functions ---
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function LearningPlatform() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(95); // Starts at 01:35
  const [showVideo, setShowVideo] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const transcriptRef = useRef(null);

  // Audio Playback Simulation
  useEffect(() => {
    let interval;
    if (isPlaying && currentTime < TOTAL_DURATION) {
      interval = setInterval(() => {
        setCurrentTime((prev) => Math.min(prev + 1, TOTAL_DURATION));
      }, 1000);
    } else if (currentTime >= TOTAL_DURATION) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime]);

  // Handle Seek
  const handleSeek = (newTime) => {
    setCurrentTime(newTime);
  };

  // Mock AI Generation
  const generateSummary = () => {
    if (aiSummary) return; // Prevent re-generation for demo
    setIsGenerating(true);
    setTimeout(() => {
      setAiSummary(`【會議重點摘要】\n\n1. 會議目的：確認會員系統改版之上線時程與測試進度。\n2. 開發進度：\n   - 已完成：會員登入、註冊、個人資料模組 (已合併主線)。\n   - 進行中：點數兌換功能 (目前進度約70%)。\n3. 技術挑戰：點數兌換面臨舊資料庫相容性問題，正在開發轉接層。\n4. 設計進度：前端UI已全面更新至最新版。`);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-6 lg:p-8 flex flex-col gap-6">
      
      {/* --- Top Navbar / Controls --- */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="mb-4 md:mb-0">
          <h1 className="text-xl font-bold tracking-wide">SyncLearn 影音學習平台</h1>
          <p className="text-xs text-slate-500">同步錄音、字幕與簡報的智慧學習環境</p>
        </div>
        <div className="flex gap-2 text-sm">
          <label className="cursor-pointer flex items-center bg-slate-100 hover:bg-slate-200 transition px-3 py-2 rounded-lg text-slate-700 font-medium">
            <UploadIcon /> 上傳錄音
            <input type="file" className="hidden" accept="audio/*,video/*" />
          </label>
          <label className="cursor-pointer flex items-center bg-slate-100 hover:bg-slate-200 transition px-3 py-2 rounded-lg text-slate-700 font-medium">
            <UploadIcon /> 上傳簡報
            <input type="file" className="hidden" accept=".pdf,.ppt,.pptx" />
          </label>
          <label className="cursor-pointer flex items-center bg-slate-100 hover:bg-slate-200 transition px-3 py-2 rounded-lg text-slate-700 font-medium">
            <UploadIcon /> 上傳字幕
            <input type="file" className="hidden" accept=".srt,.vtt" />
          </label>
        </div>
      </header>

      {/* --- Top Panels: Video & Slides --- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[40vh]">
        {/* Video Panel */}
        <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col overflow-hidden min-h-[250px]">
          <div className="absolute top-4 left-6 z-10 bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-bold tracking-widest shadow-sm">
            影像
          </div>
          {showVideo ? (
            <div className="flex-1 w-full bg-slate-900 flex items-center justify-center">
              <span className="text-white/20 text-lg">影片畫面預覽 (Video Source)</span>
            </div>
          ) : (
            <div className="flex-1 w-full bg-slate-100 flex items-center justify-center border-dashed border-2 border-slate-300 m-4 rounded-2xl">
              <span className="text-slate-400">影像已隱藏</span>
            </div>
          )}
        </div>

        {/* Slides Panel */}
        <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col overflow-hidden min-h-[250px]">
          <div className="absolute top-4 left-6 z-10 bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-bold tracking-widest shadow-sm">
            簡報
          </div>
          <div className="flex-1 w-full bg-slate-50 flex items-center justify-center p-8">
            <div className="w-full h-full bg-white shadow-md border border-slate-200 flex flex-col items-center justify-center space-y-4 rounded-lg">
              <h2 className="text-2xl font-bold text-slate-700">會員系統改版進度報告</h2>
              <p className="text-slate-500">主講人：王經理</p>
              <p className="text-slate-400 text-sm mt-8">Slide 1 / 15</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Middle Section: Player Bar --- */}
      <section className="bg-white border border-slate-200 rounded-full shadow-sm py-3 px-4 md:px-8 flex items-center gap-4 sticky top-4 z-20">
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-transform active:scale-95 shadow-md"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Mock Waveform */}
        <div 
          className="flex-1 h-12 flex items-center gap-[2px] cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            handleSeek(Math.floor(clickPos * TOTAL_DURATION));
          }}
        >
          {mockWaveformData.map((height, i) => {
            const barRatio = i / mockWaveformData.length;
            const currentRatio = currentTime / TOTAL_DURATION;
            const isPlayed = barRatio <= currentRatio;
            return (
              <div 
                key={i}
                className={`flex-1 rounded-full transition-colors duration-150 ${isPlayed ? 'bg-blue-500' : 'bg-slate-200 group-hover:bg-slate-300'}`}
                style={{ height: `${height * 100}%` }}
              />
            );
          })}
        </div>

        {/* Time & Controls */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="font-mono text-sm tracking-tighter">
            <span className="font-bold text-slate-800">{formatTime(currentTime)}</span>
            <span className="text-slate-400 mx-1">/</span>
            <span className="text-slate-500">{formatTime(TOTAL_DURATION)}</span>
          </div>
          <div className="w-px h-6 bg-slate-200 hidden md:block"></div>
          <button 
            onClick={() => setShowVideo(!showVideo)}
            className={`hidden md:flex items-center gap-2 text-sm font-medium transition-colors px-3 py-1.5 rounded-full ${showVideo ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <VideoIcon />
            顯示畫面
          </button>
        </div>
      </section>

      {/* --- Bottom Panels: Transcript & AI Summary --- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[45vh] flex-1">
        
        {/* Transcript Panel */}
        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold tracking-widest text-slate-800">逐字稿</h3>
            <span className="text-xs font-medium bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">自動滾動</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1" ref={transcriptRef}>
            {mockTranscript.map((line, idx) => {
              const isCurrent = currentTime >= line.time && (idx === mockTranscript.length - 1 || currentTime < mockTranscript[idx + 1].time);
              return (
                <div 
                  key={idx} 
                  onClick={() => handleSeek(line.time)}
                  className={`flex gap-4 p-3 rounded-xl cursor-pointer transition-colors ${isCurrent ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <div className={`font-mono text-sm pt-0.5 ${isCurrent ? 'text-blue-500 font-bold' : 'text-slate-400'}`}>
                    {formatTime(line.time)}
                  </div>
                  <div className={`w-20 flex-shrink-0 font-bold text-sm pt-0.5 ${line.color}`}>
                    {line.speaker}
                  </div>
                  <div className={`flex-1 text-base ${isCurrent ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>
                    {line.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Summary Panel */}
        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold tracking-widest text-slate-800">重點整理 (AI)</h3>
            {!aiSummary && !isGenerating && (
              <button 
                onClick={generateSummary}
                className="flex items-center text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-1.5 rounded-full transition-all shadow-sm active:scale-95"
              >
                <WandIcon /> 產生整理
              </button>
            )}
          </div>
          <div className="flex-1 p-6 overflow-y-auto relative">
            {!aiSummary && !isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-4">
                <WandIcon />
                <p className="text-sm">點擊按鈕呼叫 LM Studio AI 產生摘要</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 space-y-4">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm animate-pulse">AI 正在分析逐字稿內容...</p>
              </div>
            )}

            {aiSummary && (
              <div className="prose prose-slate prose-sm md:prose-base max-w-none whitespace-pre-line text-slate-700 leading-relaxed">
                {aiSummary}
              </div>
            )}
          </div>
        </div>

      </section>
    </div>
  );
}