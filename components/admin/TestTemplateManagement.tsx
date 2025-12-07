import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { TestTemplate } from '../../types';
import { TestTemplateFormModal } from './TestTemplateFormModal';
import { useAuth } from '../../context/AuthContext';

export const TestTemplateManagement: React.FC = () => {
    const { testTemplates, deleteTestTemplate } = useAppContext();
    const { user: actor } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TestTemplate | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleAddNew = () => {
        setEditingTemplate(null);
        setIsModalOpen(true);
    };

    const handleEdit = (template: TestTemplate) => {
        setEditingTemplate(template);
        setIsModalOpen(true);
    };

    const handleDelete = (templateId: number) => {
        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }
        if (window.confirm('Are you sure you want to deactivate this test template? This is a soft delete.')) {
            deleteTestTemplate(templateId, actor);
        }
    };

    const activeTemplates = testTemplates.filter(t => t.isActive);

    const filteredTemplates = useMemo(() => {
        const needle = searchTerm.trim().toLowerCase();
        if (!needle) return activeTemplates;
        return activeTemplates.filter(t =>
            t.name.toLowerCase().includes(needle) ||
            t.code.toLowerCase().includes(needle) ||
            (t.category || '').toLowerCase().includes(needle)
        );
    }, [activeTemplates, searchTerm]);

    return (
        <>
            {isModalOpen && (
                <TestTemplateFormModal 
                    templateToEdit={editingTemplate}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Manage Test Templates</h3>
                    <div className="flex-1 sm:max-w-sm">
                        <input
                            type="text"
                            placeholder="Search by name, code, or category"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                    <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg shadow-md hover:bg-brand-primary_hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                        Add New Test
                    </button>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTemplates.map((template, index) => (
                                <tr key={template.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{template.code}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{template.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{template.category}</td>
                                    <td className="px-4 py-3 text-sm space-x-4">
                                        <button onClick={() => handleEdit(template)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                        <button onClick={() => handleDelete(template.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};