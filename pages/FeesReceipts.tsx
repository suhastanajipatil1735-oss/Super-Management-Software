
import React, { useState, useEffect } from 'react';
import { UserProfile, Student, ReceiptLog } from '../types';
import { db } from '../services/db';
import { Card, Button, Input, Select, Modal } from '../components/UI';
import { LABELS } from '../constants';
import { openWhatsApp, formatCurrency } from '../services/whatsapp';
import { ArrowLeft, Search, FileText, Download, Send, History, CheckCircle, ReceiptText, Printer } from 'lucide-react';
import jsPDF from 'jspdf';

interface FeesReceiptsProps {
  user: UserProfile;
  lang: 'en' | 'mr';
  onBack: () => void;
}

const FeesReceipts: React.FC<FeesReceiptsProps> = ({ user, lang, onBack }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptLogs, setReceiptLogs] = useState<ReceiptLog[]>([]);
  
  // Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const labels = LABELS[lang];
  
  useEffect(() => {
    loadData();
    loadHistory();
  }, [user.mobile, selectedClass]);

  const loadData = async () => {
    if (!user.mobile) return;
    
    let collection = db.students.where('ownerMobile').equals(user.mobile);
    const data = await collection.toArray();
    let filtered = data;

    if (selectedClass !== 'ALL') {
        filtered = filtered.filter(s => s.classGrade === selectedClass);
    }
    
    setStudents(filtered);
  };

  const loadHistory = async () => {
      const logs = await db.receiptLogs.where('ownerMobile').equals(user.mobile).reverse().sortBy('date');
      setReceiptLogs(logs);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.mobile.includes(searchTerm)
  );

  const openStatusModal = (student: Student) => {
      setSelectedStudent(student);
      setShowStatusModal(true);
  };

  const generateStatusPDF = (student: Student) => {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(30, 41, 59); // Navy Blue
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(user.instituteName.toUpperCase(), 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("FEES STATUS REPORT & RECEIPT", 105, 28, { align: 'center' });
      doc.text(`Contact: +91 ${user.mobile} ${user.email ? `| Email: ${user.email}` : ''}`, 105, 34, { align: 'center' });
      if(user.address) doc.text(user.address, 105, 40, { align: 'center' });

      // Report Metadata
      doc.setTextColor(45, 55, 72);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Ref ID: STS-${Date.now().toString().slice(-6)}`, 20, 55);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 190, 55, { align: 'right' });

      // Student Details Box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(15, 60, 180, 35, 'FD');

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("STUDENT INFORMATION", 20, 68);
      doc.line(20, 70, 65, 70);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Student Name: ${student.name}`, 20, 78);
      doc.text(`Class/Grade: ${student.classGrade}`, 20, 84);
      doc.text(`Roll Number: ${student.rollNo || 'N/A'}`, 120, 78);
      doc.text(`Mobile: ${student.mobile}`, 120, 84);

      // Status Summary Table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("DETAILED FEES STATUS", 105, 110, { align: 'center' });
      
      doc.setFillColor(241, 245, 249);
      doc.rect(15, 115, 180, 10, 'F');
      doc.setFontSize(10);
      doc.text("Description", 20, 121);
      doc.text("Amount (INR)", 185, 121, { align: 'right' });

      const tableStartY = 132;
      doc.setFont("helvetica", "normal");
      
      // Row 1: Total
      doc.text("Total Course / Academic Fees", 20, tableStartY);
      doc.text(`${formatCurrency(student.feesTotal)}`, 185, tableStartY, { align: 'right' });
      doc.line(15, tableStartY + 4, 195, tableStartY + 4);

      // Row 2: Paid
      doc.text("Total Fees Paid Till Date", 20, tableStartY + 10);
      doc.setTextColor(56, 161, 105);
      doc.text(`${formatCurrency(student.feesPaid)}`, 185, tableStartY + 10, { align: 'right' });
      doc.setTextColor(30, 41, 59);
      doc.line(15, tableStartY + 14, 195, tableStartY + 14);

      // Row 3: Final Balance
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const balance = student.feesTotal - student.feesPaid;
      doc.text("OUTSTANDING BALANCE", 20, tableStartY + 25);
      
      // Fixed syntax error here
      if (balance > 0) {
          doc.setTextColor(229, 62, 62); // Danger Red
      } else {
          doc.setTextColor(56, 161, 105); // Success Green
      }
      
      doc.text(`${formatCurrency(balance)}`, 185, tableStartY + 25, { align: 'right' });

      // Footer
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      doc.line(20, 230, 70, 230);
      doc.text("Office Assistant", 45, 236, { align: 'center' });

      doc.line(140, 230, 190, 230);
      doc.text("Director / Principal", 165, 236, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("This is an automated status report generated for information purposes.", 105, 275, { align: 'center' });
      doc.text(`Generated by Super Management - ${new Date().toLocaleString()}`, 105, 280, { align: 'center' });

      doc.save(`${student.name.replace(/\s+/g, '_')}_Fees_Status.pdf`);
  };

  const handleDownloadStatus = () => {
      if (!selectedStudent) return;
      setIsProcessing(true);
      
      // Generate PDF
      generateStatusPDF(selectedStudent);

      // WhatsApp Message
      const balance = selectedStudent.feesTotal - selectedStudent.feesPaid;
      const msg = `*Fees Status Report - ${user.instituteName}*\n\nStudent: ${selectedStudent.name}\nClass: ${selectedStudent.classGrade}\n\nTotal Fees: ₹${selectedStudent.feesTotal}\nPaid: ₹${selectedStudent.feesPaid}\n*Pending Due: ₹${balance}*\n\nThank you.`;
      
      setTimeout(() => {
          openWhatsApp(selectedStudent.mobile, msg);
          setIsProcessing(false);
          setShowStatusModal(false);
      }, 800);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold">Fees Status & Receipts</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
           <div className="w-full md:w-1/3">
              <Select 
                 options={[
                     {value: 'ALL', label: 'All Classes'},
                     ...Array.from({length: 12}, (_, i) => ({ value: (i+1).toString(), label: `Class ${i+1}` }))
                 ]}
                 value={selectedClass}
                 onChange={(e) => setSelectedClass(e.target.value)}
                 className="bg-gray-50 border-gray-200"
              />
           </div>
           <div className="w-full md:w-2/3 relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input 
                   type="text" 
                   placeholder="Search Student..." 
                   className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-100"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
               />
           </div>
      </div>

      {/* Student List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map(student => {
              const pending = student.feesTotal - student.feesPaid;
              return (
                  <Card key={student.id} className="relative group hover:shadow-lg transition-all border-l-4 border-l-[#2d3748]">
                      <div className="flex justify-between items-start mb-3">
                          <div>
                              <h4 className="font-bold text-gray-800">{student.name}</h4>
                              <p className="text-xs text-gray-500">Class {student.classGrade} | Roll: {student.rollNo || '-'}</p>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${pending > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                              {pending > 0 ? 'Pending' : 'Completed'}
                          </span>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1.5 border border-gray-100">
                          <div className="flex justify-between text-[11px]">
                              <span className="text-gray-500">Total Fees:</span>
                              <span className="font-bold">₹{student.feesTotal}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                              <span className="text-gray-500">Paid Fees:</span>
                              <span className="font-bold text-green-600">₹{student.feesPaid}</span>
                          </div>
                          <div className="border-t border-gray-200 pt-1.5 flex justify-between text-xs">
                              <span className="text-gray-800 font-bold uppercase tracking-tighter">Due Balance:</span>
                              <span className="font-black text-red-500">₹{pending}</span>
                          </div>
                      </div>

                      <Button 
                        className="w-full bg-[#1e293b] hover:bg-black font-bold h-10" 
                        size="sm"
                        onClick={() => openStatusModal(student)}
                      >
                          <Printer size={16} /> Generate Fees Status
                      </Button>
                  </Card>
              );
          })}
          {filteredStudents.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
                  <Search size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No matching students found.</p>
              </div>
          )}
      </div>

      {/* Transaction History Section remains for general tracking */}
      <div className="mt-8">
          <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
              <History size={20} className="text-blue-600" /> Recent Activity
          </h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Date</th>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Student</th>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Amount</th>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Receipt</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm">
                          {receiptLogs.slice(0, 10).map(log => (
                              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-3 text-gray-500">{new Date(log.date).toLocaleDateString()}</td>
                                  <td className="px-6 py-3 font-medium text-gray-800">{log.studentName}</td>
                                  <td className="px-6 py-3 font-bold text-green-600">₹{log.amount}</td>
                                  <td className="px-6 py-3 text-right">
                                      <button className="text-blue-600 hover:underline text-xs" onClick={() => alert("Legacy receipt generation.")}>View</button>
                                  </td>
                              </tr>
                          ))}
                          {receiptLogs.length === 0 && (
                              <tr>
                                  <td colSpan={4} className="text-center py-10 text-gray-400 italic text-xs">No recent payment history.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* Status Modal - NO INPUTS AS REQUESTED */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Fees Status Summary">
          {selectedStudent && (
              <div className="space-y-6">
                  <div className="text-center pb-4 border-b border-gray-100">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FileText size={32} />
                      </div>
                      <h4 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h4>
                      <p className="text-sm text-gray-500">Academic Year 2024-25 • Class {selectedStudent.classGrade}</p>
                  </div>

                  <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Total Academic Fees</span>
                          <span className="font-bold text-gray-800">₹{selectedStudent.feesTotal}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg text-green-700">
                          <span className="text-sm">Total Fees Paid</span>
                          <span className="font-bold">₹{selectedStudent.feesPaid}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl text-red-600 border border-red-100">
                          <span className="font-bold">Outstanding Balance</span>
                          <span className="text-xl font-black">₹{selectedStudent.feesTotal - selectedStudent.feesPaid}</span>
                      </div>
                  </div>

                  <div className="pt-4">
                      <Button className="w-full bg-[#1e293b] hover:bg-black h-12 text-white font-bold text-lg shadow-lg" onClick={handleDownloadStatus} disabled={isProcessing}>
                          {isProcessing ? 'Generating PDF...' : (
                              <>
                                <Download size={20} /> Download Status Receipt
                              </>
                          )}
                      </Button>
                      <p className="text-[10px] text-gray-400 text-center mt-3 uppercase tracking-widest font-bold">
                          Official Status Report will be generated
                      </p>
                  </div>
              </div>
          )}
      </Modal>
    </div>
  );
};

export default FeesReceipts;
