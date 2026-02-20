import React, { useState, useEffect } from 'react';
import { Camera, Users, Calendar, Download, Clock, Plus, Edit2, Trash2, ChevronLeft, FileText, X, Check, AlertCircle } from 'lucide-react';

// Mock data - w prawdziwej aplikacji będzie to z bazy danych
const initialEmployees = [
  { id: 1, name: 'Jan Kowalski', position: 'Brukarz', active: true },
  { id: 2, name: 'Piotr Nowak', position: 'Operator maszyn', active: true },
  { id: 3, name: 'Anna Wiśniewska', position: 'Kierownik', active: true }
];

const statusTypes = {
  work: { label: 'Praca', color: '#10b981', icon: '💼' },
  sick: { label: 'Chorobowe', color: '#ef4444', icon: '🏥' },
  vacation: { label: 'Urlop', color: '#3b82f6', icon: '🏖️' },
  fza: { label: 'FZA', color: '#f59e0b', icon: '📋' }
};

export default function TimeTrackerApp() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [employees, setEmployees] = useState(initialEmployees);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState({});
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [newEmployee, setNewEmployee] = useState({ name: '', position: '' });
  const [bulkHours, setBulkHours] = useState('8');
  const [selectedStatus, setSelectedStatus] = useState('work');
  const [showHistory, setShowHistory] = useState(false);
  const [changeHistory, setChangeHistory] = useState([]);

  // Funkcja do generowania kluczy dla wpisów czasu
  const getEntryKey = (employeeId, date) => {
    return `${employeeId}-${date.toISOString().split('T')[0]}`;
  };

  // Pobierz dni w miesiącu
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  };

  // Dodaj pracownika
  const addEmployee = () => {
    if (newEmployee.name && newEmployee.position) {
      const employee = {
        id: Date.now(),
        name: newEmployee.name,
        position: newEmployee.position,
        active: true
      };
      setEmployees([...employees, employee]);
      setNewEmployee({ name: '', position: '' });
      setShowAddEmployee(false);
      
      // Dodaj do historii
      addToHistory('add_employee', null, `Dodano pracownika: ${employee.name}`);
    }
  };

  // Usuń pracownika
  const deleteEmployee = (id) => {
    const employee = employees.find(e => e.id === id);
    if (confirm(`Czy na pewno chcesz usunąć pracownika ${employee.name}?`)) {
      setEmployees(employees.filter(e => e.id !== id));
      addToHistory('delete_employee', null, `Usunięto pracownika: ${employee.name}`);
    }
  };

  // Dodaj godziny dla całej ekipy
  const addBulkHours = () => {
    const date = selectedDate.toISOString().split('T')[0];
    const newEntries = { ...timeEntries };
    
    employees.forEach(emp => {
      const key = getEntryKey(emp.id, selectedDate);
      const oldValue = newEntries[key];
      newEntries[key] = {
        hours: parseFloat(bulkHours),
        status: selectedStatus,
        date: date
      };
      
      // Dodaj do historii
      if (oldValue) {
        addToHistory('edit_hours', emp.id, 
          `${emp.name}: ${oldValue.hours}h (${statusTypes[oldValue.status].label}) → ${bulkHours}h (${statusTypes[selectedStatus].label})`
        );
      } else {
        addToHistory('add_hours', emp.id, 
          `${emp.name}: dodano ${bulkHours}h (${statusTypes[selectedStatus].label})`
        );
      }
    });
    
    setTimeEntries(newEntries);
    setShowBulkAdd(false);
  };

  // Dodaj/edytuj godziny dla pojedynczego pracownika
  const updateHours = (employeeId, date, hours, status) => {
    const key = getEntryKey(employeeId, date);
    const employee = employees.find(e => e.id === employeeId);
    const oldValue = timeEntries[key];
    
    setTimeEntries({
      ...timeEntries,
      [key]: { hours: parseFloat(hours), status, date: date.toISOString().split('T')[0] }
    });
    
    // Dodaj do historii
    if (oldValue) {
      addToHistory('edit_hours', employeeId, 
        `${employee.name}: ${oldValue.hours}h (${statusTypes[oldValue.status].label}) → ${hours}h (${statusTypes[status].label})`
      );
    } else {
      addToHistory('add_hours', employeeId, 
        `${employee.name}: dodano ${hours}h (${statusTypes[status].label})`
      );
    }
  };

  // Historia zmian
  const addToHistory = (action, employeeId, description) => {
    const entry = {
      id: Date.now(),
      action,
      employeeId,
      description,
      timestamp: new Date().toISOString(),
      user: 'Administrator' // W prawdziwej aplikacji - zalogowany użytkownik
    };
    setChangeHistory([entry, ...changeHistory]);
  };

  // Oblicz podsumowanie dla pracownika w miesiącu
  const getMonthSummary = (employeeId) => {
    const days = getDaysInMonth(selectedDate);
    let summary = { work: 0, sick: 0, vacation: 0, fza: 0 };
    
    days.forEach(day => {
      const key = getEntryKey(employeeId, day);
      const entry = timeEntries[key];
      if (entry) {
        summary[entry.status] += entry.hours;
      }
    });
    
    return summary;
  };

  // Export do CSV (prosty przykład)
  const exportToCSV = (employeeId = null) => {
    let csvContent = 'Pracownik,Data,Godziny,Status\n';
    const targetEmployees = employeeId ? [employees.find(e => e.id === employeeId)] : employees;
    
    targetEmployees.forEach(emp => {
      getDaysInMonth(selectedDate).forEach(day => {
        const key = getEntryKey(emp.id, day);
        const entry = timeEntries[key];
        if (entry) {
          csvContent += `${emp.name},${day.toLocaleDateString('pl-PL')},${entry.hours},${statusTypes[entry.status].label}\n`;
        }
      });
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `zestawienie_${selectedDate.getMonth() + 1}_${selectedDate.getFullYear()}.csv`;
    link.click();
    
    addToHistory('export', employeeId, 
      employeeId ? `Eksport dla ${targetEmployees[0].name}` : 'Eksport dla wszystkich pracowników'
    );
  };

  // Dashboard View
  const DashboardView = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600">
        <h1 className="text-3xl font-black text-white mb-2">TimeTracker</h1>
        <p className="text-orange-100 text-sm font-medium">Rejestr czasu pracy</p>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setShowBulkAdd(true)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all active:scale-95"
          >
            <Clock className="w-8 h-8 text-orange-500 mb-2" />
            <div className="text-sm font-bold text-gray-900">Dodaj godziny</div>
            <div className="text-xs text-gray-500 mt-1">dla ekipy</div>
          </button>

          <button
            onClick={() => setShowOCR(true)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all active:scale-95"
          >
            <Camera className="w-8 h-8 text-blue-500 mb-2" />
            <div className="text-sm font-bold text-gray-900">Skanuj</div>
            <div className="text-xs text-gray-500 mt-1">dokumenty dostaw</div>
          </button>

          <button
            onClick={() => setShowHistory(true)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all active:scale-95"
          >
            <FileText className="w-8 h-8 text-purple-500 mb-2" />
            <div className="text-sm font-bold text-gray-900">Historia</div>
            <div className="text-xs text-gray-500 mt-1">zmian</div>
          </button>

          <button
            onClick={() => exportToCSV()}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all active:scale-95"
          >
            <Download className="w-8 h-8 text-green-500 mb-2" />
            <div className="text-sm font-bold text-gray-900">Export</div>
            <div className="text-xs text-gray-500 mt-1">wszystkich</div>
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900">Pracownicy</h2>
          <button
            onClick={() => setShowAddEmployee(true)}
            className="bg-orange-500 text-white p-2 rounded-xl hover:bg-orange-600 transition-colors active:scale-95"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {employees.map(emp => {
            const summary = getMonthSummary(emp.id);
            const totalHours = Object.values(summary).reduce((a, b) => a + b, 0);
            
            return (
              <div
                key={emp.id}
                onClick={() => {
                  setSelectedEmployee(emp);
                  setCurrentView('employee');
                }}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-base">{emp.name}</h3>
                    <p className="text-sm text-gray-500">{emp.position}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEmployee(emp.id);
                    }}
                    className="text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-xs">
                  <div className="bg-gray-100 px-3 py-1.5 rounded-lg font-semibold text-gray-700">
                    {totalHours}h razem
                  </div>
                  {summary.work > 0 && (
                    <div className="bg-green-50 px-3 py-1.5 rounded-lg font-semibold text-green-700">
                      {statusTypes.work.icon} {summary.work}h
                    </div>
                  )}
                  {summary.vacation > 0 && (
                    <div className="bg-blue-50 px-3 py-1.5 rounded-lg font-semibold text-blue-700">
                      {statusTypes.vacation.icon} {summary.vacation}h
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Employee Detail View
  const EmployeeDetailView = () => {
    const days = getDaysInMonth(selectedDate);
    const summary = getMonthSummary(selectedEmployee.id);
    
    return (
      <div className="flex flex-col h-full">
        <div className="p-6 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="text-white mb-4 flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-semibold">Powrót</span>
          </button>
          <h1 className="text-2xl font-black text-white mb-1">{selectedEmployee.name}</h1>
          <p className="text-orange-100 text-sm font-medium">{selectedEmployee.position}</p>
        </div>

        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">
              {selectedDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => exportToCSV(selectedEmployee.id)}
              className="text-sm bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition-colors font-semibold"
            >
              Export
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-xs">
            {Object.entries(summary).map(([status, hours]) => (
              hours > 0 && (
                <div key={status} className="bg-gray-50 px-2 py-2 rounded-lg text-center">
                  <div className="text-lg mb-0.5">{statusTypes[status].icon}</div>
                  <div className="font-bold text-gray-900">{hours}h</div>
                  <div className="text-gray-500 text-xs">{statusTypes[status].label}</div>
                </div>
              )
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          <div className="space-y-2">
            {days.map(day => {
              const key = getEntryKey(selectedEmployee.id, day);
              const entry = timeEntries[key];
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={day.toISOString()}
                  className={`bg-white p-4 rounded-xl border ${
                    isToday ? 'border-orange-400 shadow-sm' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold text-gray-900">
                        {day.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {day.toLocaleDateString('pl-PL', { month: 'short' })}
                      </div>
                    </div>
                    
                    {entry ? (
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1.5 rounded-lg font-bold text-sm`}
                             style={{ 
                               backgroundColor: statusTypes[entry.status].color + '20',
                               color: statusTypes[entry.status].color 
                             }}>
                          {statusTypes[entry.status].icon} {entry.hours}h
                        </div>
                        <button
                          onClick={() => setEditMode({ employeeId: selectedEmployee.id, day, entry })}
                          className="text-orange-500 p-1.5 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditMode({ employeeId: selectedEmployee.id, day, entry: null })}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-semibold text-sm"
                      >
                        Dodaj
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Modals
  const AddEmployeeModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-slideUp">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900">Nowy pracownik</h2>
          <button onClick={() => setShowAddEmployee(false)} className="text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Imię i nazwisko</label>
            <input
              type="text"
              value={newEmployee.name}
              onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none font-medium"
              placeholder="Jan Kowalski"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Stanowisko</label>
            <input
              type="text"
              value={newEmployee.position}
              onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none font-medium"
              placeholder="Brukarz"
            />
          </div>
        </div>
        
        <button
          onClick={addEmployee}
          className="w-full bg-orange-500 text-white py-4 rounded-xl hover:bg-orange-600 transition-colors font-bold text-lg"
        >
          Dodaj pracownika
        </button>
      </div>
    </div>
  );

  const BulkAddModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-slideUp">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900">Dodaj godziny dla ekipy</h2>
          <button onClick={() => setShowBulkAdd(false)} className="text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Data</label>
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none font-medium"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Liczba godzin</label>
            <input
              type="number"
              value={bulkHours}
              onChange={(e) => setBulkHours(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none font-medium text-2xl text-center"
              min="0"
              max="24"
              step="0.5"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(statusTypes).map(([key, type]) => (
                <button
                  key={key}
                  onClick={() => setSelectedStatus(key)}
                  className={`p-4 rounded-xl border-2 transition-all font-bold ${
                    selectedStatus === key
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-sm">{type.label}</div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 font-medium">
                Godziny zostaną dodane dla wszystkich {employees.length} pracowników na dzień {selectedDate.toLocaleDateString('pl-PL')}
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={addBulkHours}
          className="w-full bg-orange-500 text-white py-4 rounded-xl hover:bg-orange-600 transition-colors font-bold text-lg"
        >
          Dodaj godziny
        </button>
      </div>
    </div>
  );

  const EditModal = () => {
    const [hours, setHours] = useState(editMode.entry?.hours || '8');
    const [status, setStatus] = useState(editMode.entry?.status || 'work');
    
    const handleSave = () => {
      updateHours(editMode.employeeId, editMode.day, hours, status);
      setEditMode(null);
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 animate-fadeIn">
        <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-slideUp">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900">
              {editMode.day.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}
            </h2>
            <button onClick={() => setEditMode(null)} className="text-gray-400">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Liczba godzin</label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none font-medium text-2xl text-center"
                min="0"
                max="24"
                step="0.5"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statusTypes).map(([key, type]) => (
                  <button
                    key={key}
                    onClick={() => setStatus(key)}
                    className={`p-4 rounded-xl border-2 transition-all font-bold ${
                      status === key
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-sm">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            className="w-full bg-orange-500 text-white py-4 rounded-xl hover:bg-orange-600 transition-colors font-bold text-lg"
          >
            Zapisz
          </button>
        </div>
      </div>
    );
  };

  const OCRModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-slideUp">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900">Skanuj dokument</h2>
          <button onClick={() => setShowOCR(false)} className="text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-6">
          <div className="border-4 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-orange-400 transition-colors cursor-pointer bg-gray-50">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-bold mb-2">Zrób zdjęcie dokumentu</p>
            <p className="text-sm text-gray-500">lub wybierz z galerii</p>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-xl mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-bold mb-1">Funkcja OCR</p>
              <p>System automatycznie rozpozna tekst z dokumentu dostawy i zapisze dane w bazie.</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            alert('Demo: W pełnej wersji tutaj uruchomi się kamera lub wybór pliku');
            setShowOCR(false);
          }}
          className="w-full bg-blue-500 text-white py-4 rounded-xl hover:bg-blue-600 transition-colors font-bold text-lg"
        >
          Otwórz kamerę
        </button>
      </div>
    </div>
  );

  const HistoryModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-slideUp h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900">Historia zmian</h2>
          <button onClick={() => setShowHistory(false)} className="text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto space-y-3">
          {changeHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Brak historii zmian</p>
            </div>
          ) : (
            changeHistory.map(entry => (
              <div key={entry.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-bold text-gray-900">{entry.description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{entry.user}</span>
                  <span>•</span>
                  <span>{new Date(entry.timestamp).toLocaleString('pl-PL')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen max-w-md mx-auto bg-white overflow-hidden font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        .active\\:scale-95:active {
          transform: scale(0.95);
        }
        
        .active\\:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
      
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'employee' && <EmployeeDetailView />}
      
      {showAddEmployee && <AddEmployeeModal />}
      {showBulkAdd && <BulkAddModal />}
      {editMode && <EditModal />}
      {showOCR && <OCRModal />}
      {showHistory && <HistoryModal />}
    </div>
  );
}