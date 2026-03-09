'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Upload, Download, FileText, Check, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';

interface CsvRow {
  personalId: string;
  fullName: string;
  militaryRole: string;
  departmentCode: string;
  phone?: string;
}

interface PreviewResult {
  totalRows: number;
  validRows: CsvRow[];
  errors: { row: number; message: string }[];
}

interface ImportResult {
  successCount: number;
  errors: { personalId: string; message: string }[];
}

interface SampleInfo {
  csv: string;
  columns: { name: string; description: string; required: boolean }[];
}

export default function AdminCsvImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { data: sampleInfo } = useQuery<SampleInfo>({
    queryKey: ['csv-sample'],
    queryFn: async () => {
      const response = await api.get('/csv-import/sample');
      return response.data;
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/csv-import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data as PreviewResult;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setImportResult(null);
      if (data.errors.length > 0) {
        toast.error(`נמצאו ${data.errors.length} שגיאות בקובץ`);
      } else {
        toast.success(`נמצאו ${data.validRows.length} שורות תקינות`);
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'שגיאה בקריאת הקובץ';
      toast.error(message);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (rows: CsvRow[]) => {
      const response = await api.post('/csv-import/import', { rows });
      return response.data as ImportResult;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setPreviewData(null);
      if (data.successCount > 0) {
        toast.success(`${data.successCount} משתמשים יובאו בהצלחה`);
      }
      if (data.errors.length > 0) {
        toast.error(`${data.errors.length} משתמשים נכשלו בייבוא`);
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'שגיאה בייבוא';
      toast.error(message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      previewMutation.mutate(file);
    }
  };

  const handleDownloadSample = () => {
    if (!sampleInfo?.csv) return;

    const blob = new Blob([sampleInfo.csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_import.csv';
    link.click();
  };

  const handleImport = () => {
    if (previewData?.validRows && previewData.validRows.length > 0) {
      importMutation.mutate(previewData.validRows);
    }
  };

  const handleReset = () => {
    setPreviewData(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">ייבוא משתמשים מ-CSV</h1>
        <p className="text-gray-600 mt-1">העלה קובץ CSV עם רשימת חיילים וקצינים לייבוא מהיר</p>
      </div>

      {/* Instructions */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-military-600" />
            <span>מבנה קובץ CSV</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-right">עמודה</th>
                    <th className="px-3 py-2 text-right">תיאור</th>
                    <th className="px-3 py-2 text-right">חובה</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sampleInfo?.columns.map((col) => (
                    <tr key={col.name}>
                      <td className="px-3 py-2 font-mono text-blue-600">{col.name}</td>
                      <td className="px-3 py-2">{col.description}</td>
                      <td className="px-3 py-2">
                        {col.required ? (
                          <span className="text-red-500">כן</span>
                        ) : (
                          <span className="text-gray-400">לא</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleDownloadSample}>
                <Download className="w-4 h-4 ml-1" />
                הורד קובץ לדוגמה
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-military-600" />
            <span>העלאת קובץ</span>
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-military-500 transition-colors"
          >
            {previewMutation.isPending ? (
              <Spinner />
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">לחץ כאן או גרור קובץ CSV</p>
                <p className="text-sm text-gray-400 mt-2">קבצי CSV בלבד</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {previewData && (
        <Card className="mb-6">
          <CardHeader className="flex items-center justify-between">
            <span>תצוגה מקדימה</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleReset}>
                <X className="w-4 h-4 ml-1" />
                נקה
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                isLoading={importMutation.isPending}
                disabled={previewData.validRows.length === 0}
              >
                <Check className="w-4 h-4 ml-1" />
                ייבא {previewData.validRows.length} משתמשים
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-700">{previewData.totalRows}</div>
                <div className="text-sm text-gray-500">סה״כ שורות</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-700">{previewData.validRows.length}</div>
                <div className="text-sm text-green-600">שורות תקינות</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-700">{previewData.errors.length}</div>
                <div className="text-sm text-red-600">שגיאות</div>
              </div>
            </div>

            {/* Errors */}
            {previewData.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  שגיאות בקובץ
                </h3>
                <div className="bg-red-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {previewData.errors.map((err, i) => (
                    <div key={i} className="text-sm text-red-700">
                      שורה {err.row}: {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Valid Rows */}
            {previewData.validRows.length > 0 && (
              <div>
                <h3 className="font-medium text-green-700 mb-2">משתמשים לייבוא</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-right">מספר אישי</th>
                        <th className="px-3 py-2 text-right">שם מלא</th>
                        <th className="px-3 py-2 text-right">תפקיד</th>
                        <th className="px-3 py-2 text-right">מחלקה</th>
                        <th className="px-3 py-2 text-right">טלפון</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewData.validRows.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono">{row.personalId}</td>
                          <td className="px-3 py-2">{row.fullName}</td>
                          <td className="px-3 py-2">{row.militaryRole}</td>
                          <td className="px-3 py-2">{row.departmentCode}</td>
                          <td className="px-3 py-2">{row.phone || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.validRows.length > 10 && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      ועוד {previewData.validRows.length - 10} משתמשים...
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card>
          <CardHeader>
            <span>תוצאות ייבוא</span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-700">{importResult.successCount}</div>
                <div className="text-sm text-green-600">יובאו בהצלחה</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-700">{importResult.errors.length}</div>
                <div className="text-sm text-red-600">נכשלו</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="font-medium text-red-700 mb-2">שגיאות ייבוא</h3>
                {importResult.errors.map((err, i) => (
                  <div key={i} className="text-sm text-red-700">
                    {err.personalId}: {err.message}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <Button onClick={handleReset}>
                ייבוא נוסף
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
