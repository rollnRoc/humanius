import React, { useState, useEffect } from 'react';
import { Settings, FileText, CheckCircle, Clock, Plus, Trash2, Play, Check, X, ArrowLeftRight } from 'lucide-react';

interface WorkflowTask {
  id: string;
  title: string;
  desc: string;
  status: 'bekleyen' | 'islemde' | 'tamamlanan' | 'iptal';
  date: string;
}

interface IsAkisiProps {
  companyId?: string;
}

const IsAkisi: React.FC<IsAkisiProps> = ({ companyId = 'default' }) => {
  const [tasks, setTasks] = useState<WorkflowTask[]>(() => {
    const saved = localStorage.getItem(`humanius_workflow_tasks_${companyId}`);
    return saved ? JSON.parse(saved) : []; // Empty by default (no mock data)
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`humanius_workflow_tasks_${companyId}`, JSON.stringify(tasks));
  }, [tasks, companyId]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: WorkflowTask = {
      id: `task-${Date.now()}`,
      title: newTitle,
      desc: newDesc,
      status: 'bekleyen',
      date: newDate
    };

    setTasks([...tasks, newTask]);
    setNewTitle('');
    setNewDesc('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setShowAddForm(false);
  };

  const updateStatus = (id: string, newStatus: WorkflowTask['status']) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const deleteTask = (id: string) => {
    if (window.confirm('Bu görevi silmek istediğinize emin misiniz?')) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const columns = [
    {
      id: 'bekleyen' as const,
      title: 'Bekleyen İşlemler',
      color: 'border-amber-200 bg-amber-50/50',
      headerColor: 'text-amber-800 bg-amber-100',
      icon: Clock,
      actions: (task: WorkflowTask) => (
        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => updateStatus(task.id, 'islemde')}
            className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
            title="İşleme Al"
          >
            <Play className="w-3.5 h-3.5" />
            <span>İşleme Al</span>
          </button>
          <button
            onClick={() => updateStatus(task.id, 'iptal')}
            className="flex items-center justify-center p-1 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-all"
            title="İptal Et"
          >
            <X className="w-3.5 h-3.5" />
            <span>İptal</span>
          </button>
        </div>
      )
    },
    {
      id: 'islemde' as const,
      title: 'İşlemde',
      color: 'border-blue-200 bg-blue-50/50',
      headerColor: 'text-blue-800 bg-blue-100',
      icon: Settings,
      actions: (task: WorkflowTask) => (
        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => updateStatus(task.id, 'tamamlanan')}
            className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-sm transition-all"
            title="Tamamla"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Tamamla</span>
          </button>
          <button
            onClick={() => updateStatus(task.id, 'iptal')}
            className="flex items-center justify-center p-1 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-all"
            title="İptal Et"
          >
            <X className="w-3.5 h-3.5" />
            <span>İptal</span>
          </button>
        </div>
      )
    },
    {
      id: 'tamamlanan' as const,
      title: 'Tamamlanan',
      color: 'border-green-200 bg-green-50/50',
      headerColor: 'text-green-800 bg-green-100',
      icon: CheckCircle,
      actions: (task: WorkflowTask) => (
        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => updateStatus(task.id, 'islemde')}
            className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all"
            title="Geri Al (İşlemde)"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Geri Al</span>
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            className="flex items-center justify-center p-1 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-all"
            title="Sil"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
    {
      id: 'iptal' as const,
      title: 'İptal Edilenler',
      color: 'border-red-200 bg-red-50/30',
      headerColor: 'text-red-800 bg-red-100',
      icon: X,
      actions: (task: WorkflowTask) => (
        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => updateStatus(task.id, 'bekleyen')}
            className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all"
            title="Geri Al (Bekleyen)"
          >
            <span>Aktifleştir</span>
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            className="flex items-center justify-center p-1 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-all"
            title="Sil"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">İş Akışı Panosu</h2>
          <p className="text-sm text-gray-500 mt-0.5">Operasyonel İK süreçlerinin anlık durum panosu (Kanban)</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Yeni Görev Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className={`rounded-2xl border ${col.color} overflow-hidden flex flex-col h-[600px] shadow-sm`}>
              <div className={`p-4 flex items-center justify-between border-b ${col.color.replace('bg-', 'border-')} ${col.headerColor}`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <col.icon className="w-4.5 h-4.5" />
                  {col.title}
                </div>
                <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm text-gray-700">
                  {colTasks.length}
                </span>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {colTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-5 text-gray-400">
                    <p className="text-xs">Görev bulunmamaktadır</p>
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div
                      key={task.id}
                      className="bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow group relative"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-bold text-gray-800 text-sm">{task.title}</h4>
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      </div>
                      <p className="text-xs text-gray-600 mb-3 whitespace-pre-wrap">{task.desc}</p>
                      
                      <div className="flex items-center text-[10px] text-gray-500 font-semibold">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        Termin: {task.date}
                      </div>

                      {col.actions(task)}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-base">Yeni Görev Oluştur</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={addTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Görev Adı</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Örn: SGK İşe Giriş Bildirgesi"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Açıklama / Not</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Göreve ait detaylar..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Termin Tarihi</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm"
                >
                  Görev Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IsAkisi;
