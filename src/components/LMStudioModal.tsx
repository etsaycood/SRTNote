import React, { useState } from 'react';
import { LMStudioConfig } from '../types';
import { fetchLMStudioModels, validateApiBaseUrl } from '../utils/lmStudioClient';
import { PROMPT_PRESETS, getPromptPreset } from '../utils/promptPresets';
import { Cpu, Server, CheckCircle2, AlertCircle, RefreshCw, X, Sliders, Sparkles, RotateCcw } from 'lucide-react';

interface LMStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LMStudioConfig;
  onSave: (config: LMStudioConfig) => void;
}

export const LMStudioModal: React.FC<LMStudioModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave
}) => {
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [model, setModel] = useState(config.model);
  const [temperature, setTemperature] = useState(config.temperature);
  const [contextWindow, setContextWindow] = useState(config.contextWindow || 4096);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt);
  const [activePresetId, setActivePresetId] = useState<string>(config.presetId || 'business');
  
  const [isChecking, setIsChecking] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const models = await fetchLMStudioModels(baseUrl);
      setAvailableModels(models);
      if (models.length > 0) {
        if (!model || !models.includes(model)) {
          setModel(models[0]);
        }
        setStatusMessage({
          type: 'success',
          text: `連線成功！偵測到 ${models.length} 個本機/遠端模型。`
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: '連線成功！但 API 伺服器尚未載入模型，請在伺服器中先啟動任一模型。'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || '無法連線至 API 伺服器，請確認服務已啟動且 CORS 允許跨域。'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSelectPreset = (id: string) => {
    setActivePresetId(id);
    const preset = getPromptPreset(id);
    setSystemPrompt(preset.systemPrompt);
  };

  const handlePromptChange = (val: string) => {
    setSystemPrompt(val);
    if (activePresetId !== 'custom') {
      setActivePresetId('custom');
    }
  };

  const handleSave = () => {
    try {
      const clean = validateApiBaseUrl(baseUrl);
      onSave({
        baseUrl: clean,
        model,
        temperature,
        contextWindow,
        systemPrompt,
        presetId: activePresetId
      });
      onClose();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || '無效的 API 網址格式'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">AI API 連線設定</h2>
              <p className="text-xs text-slate-400">支援本機或遠端相容 OpenAI API 格式之模型伺服器 (LM Studio、Ollama、vLLM)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-sm">
          {/* Base URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              API 端點 (Base URL)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Server className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:1234/v1"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isChecking}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? '測試中...' : '測試連線 & 偵測模型'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              預設為 <code className="text-purple-300 bg-purple-950/50 px-1 py-0.5 rounded">http://localhost:1234/v1</code>（請在 LM Studio 的 Local Server 勾選啟動）
            </p>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              模型名稱 (Model Identifier)
            </label>
            {availableModels.length > 0 ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="例如：qwen2.5-7b-instruct 或留空使用預設載入模型"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
              />
            )}
          </div>

          {/* Temperature Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                生成精準度 (Temperature: {temperature})
              </label>
              <span className="text-[11px] text-slate-400">較低值更嚴謹，較高值更有創意</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Context Window / 上下文長度限制 */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                模型上下文長度限制 (Context Window)
              </label>
              <span className="text-[11px] text-slate-400">當字幕超出時提醒分段/自訂區間</span>
            </div>
            <select
              value={contextWindow}
              onChange={(e) => setContextWindow(parseInt(e.target.value, 10))}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
            >
              <option value={2048}>2,048 Tokens (~1,200 字，小型模型)</option>
              <option value={4096}>4,096 Tokens (~2,500 字，預設標準)</option>
              <option value={8192}>8,192 Tokens (~5,000 字，中型上下文)</option>
              <option value={16384}>16,384 Tokens (~10,000 字，長文模型)</option>
              <option value={32768}>32,768 Tokens (~20,000 字，超長上下文)</option>
            </select>
          </div>

          {/* System Prompt & Scenario Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                情境提示詞範本 (Scenario Presets)
              </label>
              <span className="text-[11px] text-purple-400">點選即可快速切換對應情境</span>
            </div>

            {/* Scenario Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {PROMPT_PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      isActive
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200 ring-1 ring-purple-500/40 shadow-sm'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1.5 mb-1">
                      <span>{preset.icon}</span>
                      <span>{preset.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                系統提示詞內容 (可自由編輯微調)
              </label>
              {activePresetId && (
                <button
                  type="button"
                  onClick={() => handleSelectPreset(activePresetId)}
                  className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  重設為該情境預設詞
                </button>
              )}
            </div>
            <textarea
              rows={6}
              value={systemPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-sans text-xs leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-purple-600/25 transition-all active:scale-95"
          >
            儲存連線設定
          </button>
        </div>
      </div>
    </div>
  );
};
