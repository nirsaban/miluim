'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, RefreshCw, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

interface TableInfo {
  name: string;
  modelName: string;
  displayName: string;
}

interface ColumnInfo {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isRelation: boolean;
  defaultValue?: string;
}

interface TableDataResponse {
  data: Record<string, any>[];
  total: number;
  page: number;
  totalPages: number;
}

export default function SystemPage() {
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newData, setNewData] = useState<Record<string, any>>({});

  // Fetch all tables
  const { data: tables, isLoading: tablesLoading } = useQuery<TableInfo[]>({
    queryKey: ['system-tables'],
    queryFn: async () => {
      const response = await api.get('/system/tables');
      return response.data;
    },
  });

  // Select first table by default
  useEffect(() => {
    if (tables && tables.length > 0 && !selectedTable) {
      setSelectedTable(tables[0].name);
    }
  }, [tables, selectedTable]);

  // Fetch schema for selected table
  const { data: schema } = useQuery<ColumnInfo[]>({
    queryKey: ['system-schema', selectedTable],
    queryFn: async () => {
      if (!selectedTable) return [];
      const response = await api.get(`/system/tables/${selectedTable}/schema`);
      return response.data;
    },
    enabled: !!selectedTable,
  });

  // Fetch data for selected table
  const { data: tableData, isLoading: dataLoading, refetch: refetchData } = useQuery<TableDataResponse>({
    queryKey: ['system-data', selectedTable, page],
    queryFn: async () => {
      if (!selectedTable) return { data: [], total: 0, page: 1, totalPages: 0 };
      const response = await api.get(`/system/tables/${selectedTable}/data?page=${page}&limit=20`);
      return response.data;
    },
    enabled: !!selectedTable,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await api.post(`/system/tables/${selectedTable}/data`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-data', selectedTable] });
      toast.success('Record created successfully');
      setIsCreating(false);
      setNewData({});
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create record');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const response = await api.patch(`/system/tables/${selectedTable}/data/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-data', selectedTable] });
      toast.success('Record updated successfully');
      setEditingId(null);
      setEditData({});
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update record');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/system/tables/${selectedTable}/data/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-data', selectedTable] });
      toast.success('Record deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete record');
    },
  });

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(1);
    setEditingId(null);
    setIsCreating(false);
  };

  const handleEdit = (record: Record<string, any>) => {
    setEditingId(record.id);
    setEditData({ ...record });
    setIsCreating(false);
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: editData });
    }
  };

  const handleCreate = () => {
    createMutation.mutate(newData);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      if (value instanceof Date) return value.toISOString();
      return JSON.stringify(value);
    }
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  };

  const parseInputValue = (value: string, type: string): any => {
    if (value === '' || value === 'null') return null;
    if (type.includes('int') || type === 'bigint') return parseInt(value, 10);
    if (type.includes('numeric') || type.includes('decimal') || type === 'double precision') return parseFloat(value);
    if (type === 'boolean') return value === 'true';
    if (type === 'jsonb' || type === 'json') {
      try { return JSON.parse(value); } catch { return value; }
    }
    return value;
  };

  // Get visible columns (filter out some internal ones for display)
  const visibleColumns = schema?.filter(col => !['passwordHash'].includes(col.name)) || [];

  if (tablesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Tabs */}
      <div className="bg-gray-800 rounded-lg p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tables?.map((table) => (
            <button
              key={table.name}
              onClick={() => handleTableSelect(table.name)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                selectedTable === table.name
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {table.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* Table Info */}
      {selectedTable && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">{selectedTable}</h2>
              <p className="text-sm text-gray-400">
                {tableData?.total || 0} records total
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => refetchData()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsCreating(true);
                  setEditingId(null);
                  setNewData({});
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Record
              </Button>
            </div>
          </div>

          {/* Create Form */}
          {isCreating && (
            <div className="mb-4 p-4 bg-gray-700 rounded-lg border border-purple-500">
              <h3 className="text-sm font-medium text-white mb-3">New Record</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {visibleColumns
                  .filter(col => !col.isPrimaryKey && col.name !== 'createdAt' && col.name !== 'updatedAt')
                  .map((col) => (
                    <div key={col.name}>
                      <label className="block text-xs text-gray-400 mb-1">
                        {col.name}
                        {!col.isNullable && <span className="text-red-400">*</span>}
                        <span className="text-gray-600 ml-1">({col.type})</span>
                      </label>
                      <Input
                        value={newData[col.name] ?? ''}
                        onChange={(e) => setNewData({ ...newData, [col.name]: e.target.value })}
                        placeholder={col.isNullable ? 'null' : 'required'}
                        className="bg-gray-600 border-gray-500 text-white text-sm"
                      />
                    </div>
                  ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleCreate}
                  isLoading={createMutation.isPending}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setIsCreating(false);
                    setNewData({});
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Data Table */}
          {dataLoading ? (
            <div className="flex items-center justify-center h-32">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    {visibleColumns.map((col) => (
                      <th
                        key={col.name}
                        className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap"
                      >
                        {col.name}
                        {col.isPrimaryKey && <span className="text-purple-400 ml-1">PK</span>}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {tableData?.data.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-700/50">
                      {visibleColumns.map((col) => (
                        <td key={col.name} className="px-3 py-2 whitespace-nowrap">
                          {editingId === record.id && !col.isPrimaryKey ? (
                            <Input
                              value={editData[col.name] ?? ''}
                              onChange={(e) => setEditData({ ...editData, [col.name]: e.target.value })}
                              className="bg-gray-600 border-gray-500 text-white text-xs w-full min-w-[100px]"
                            />
                          ) : (
                            <span className="text-gray-300 text-xs font-mono truncate max-w-[200px] block">
                              {formatValue(record[col.name])}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {editingId === record.id ? (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={handleSave}
                              disabled={updateMutation.isPending}
                              className="p-1 text-green-400 hover:text-green-300"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditData({});
                              }}
                              className="p-1 text-gray-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-1 text-blue-400 hover:text-blue-300"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              disabled={deleteMutation.isPending}
                              className="p-1 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {tableData?.data.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No records found
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {tableData && tableData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
              <span className="text-sm text-gray-400">
                Page {tableData.page} of {tableData.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronRight className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage(p => Math.min(tableData.totalPages, p + 1))}
                  disabled={page === tableData.totalPages}
                >
                  Next
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
