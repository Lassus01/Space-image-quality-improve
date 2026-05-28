import { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { Brain, BarChart3, TestTube, Sparkles, Info } from 'lucide-react';
import { TrainingTab } from './components/TrainingTab';
import { StatisticsTab } from './components/StatisticsTab';
import { TestingTab } from './components/TestingTab';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">SpaceEnhance AI - EDSR</h1>
                <p className="text-xs text-slate-400">Система улучшения космических изображений на базе PyTorch</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Info className="w-4 h-4" />
              <span>Enhanced Deep Super-Resolution Network</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 bg-slate-900/30">
        <div className="container mx-auto px-6">
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                color: '#94a3b8',
                textTransform: 'none',
                fontSize: '0.95rem',
                minHeight: '60px',
                '&.Mui-selected': {
                  color: '#3b82f6',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#3b82f6',
                height: 3,
              },
            }}
          >
            <Tab
              icon={<Brain className="w-5 h-5" />}
              iconPosition="start"
              label="Обучение нейросети"
            />
            <Tab
              icon={<BarChart3 className="w-5 h-5" />}
              iconPosition="start"
              label="Статистика"
            />
            <Tab
              icon={<TestTube className="w-5 h-5" />}
              iconPosition="start"
              label="Проверка работы"
            />
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="h-[calc(100vh-180px)]">
          <Box hidden={activeTab !== 0}>
            {activeTab === 0 && <TrainingTab />}
          </Box>
          <Box hidden={activeTab !== 1}>
            {activeTab === 1 && <StatisticsTab />}
          </Box>
          <Box hidden={activeTab !== 2}>
            {activeTab === 2 && <TestingTab />}
          </Box>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800 px-6 py-3">
        <div className="container mx-auto flex items-center justify-between text-xs text-slate-400">
          <div>Система улучшения качества космических снимков на базе EDSR (PyTorch)</div>
          <div>Версия 1.0.0 | Вкладка: {['Обучение', 'Статистика', 'Проверка'][activeTab]}</div>
        </div>
      </div>
    </div>
  );
}