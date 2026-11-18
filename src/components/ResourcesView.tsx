import React, { useEffect, useState } from 'react';
import { Download, Eye, Search, Trash2, X } from 'lucide-react';
import {
  api,
  ApiError,
  formatShortDate,
  triggerTextDownload,
} from '../lib/api.ts';
import type { AcademicResource, User } from '../shared/types.ts';
import {
  canDeleteContent,
  canPublishContent,
  filterResources,
} from '../shared/validation.ts';

interface ResourcesViewProps {
  user: User;
  createModalOpen: boolean;
  onCloseCreateModal: () => void;
  onOpenCreateModal: () => void;
}

const RESOURCE_TYPES = [
  'All',
  'Syllabus',
  'Lecture Notes',
  'Lab Manual',
  'Campus Form',
  'Past Paper',
] as const;

export const ResourcesView: React.FC<ResourcesViewProps> = ({
  user,
  createModalOpen,
  onCloseCreateModal,
  onOpenCreateModal,
}) => {
  const [resources, setResources] = useState<AcademicResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [resourceType, setResourceType] = useState('All');
  const [department, setDepartment] = useState('All');
  const [previewResource, setPreviewResource] =
    useState<AcademicResource | null>(null);

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newType, setNewType] =
    useState<AcademicResource['resourceType']>('Lecture Notes');
  const [newDept, setNewDept] = useState(user.department);
  const [courseCode, setCourseCode] = useState('CS-301');
  const [fileName, setFileName] = useState('CS301_Study_Guide.txt');
  const [contentBody, setContentBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canPublish = canPublishContent(user.role);

  const loadResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getResources();
      setResources(data.resources);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load academic resources.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const departments = [
    'All',
    ...Array.from(new Set(resources.map((r) => r.department))),
  ];

  const handleDownload = async (res: AcademicResource) => {
    triggerTextDownload(res.fileName, res.contentBody);
    try {
      const { resource } = await api.recordResourceDownload(res.id);
      setResources((prev) =>
        prev.map((row) => (row.id === resource.id ? resource : row))
      );
      if (previewResource?.id === resource.id) {
        setPreviewResource(resource);
      }
    } catch {
      // Non-blocking download count increment
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (
      title.trim().length < 3 ||
      description.trim().length < 10 ||
      contentBody.trim().length < 10
    ) {
      setFormError(
        'Title, description, and document content (min 10 characters) are required.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const { resource } = await api.createResource({
        title: title.trim(),
        description: description.trim(),
        resourceType: newType,
        department: newDept.trim() || user.department,
        courseCode: courseCode.trim() || 'GEN-100',
        fileName: fileName.trim() || 'campus-resource.txt',
        contentBody: contentBody.trim(),
      });
      setResources((prev) => [resource, ...prev]);
      setTitle('');
      setDescription('');
      setContentBody('');
      onCloseCreateModal();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Failed to share resource.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteResource(id);
      setResources((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to delete resource.'
      );
    }
  };

  const filtered = filterResources(resources, query, resourceType, department);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Filter resources by type"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md"
          >
            {RESOURCE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={resourceType === type}
                onClick={() => setResourceType(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  resourceType === type
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'All' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full xl:w-72">
          <Search
            className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search academic resources"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course, title, or file…"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 rounded-lg bg-white border border-slate-200 animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            No academic resources match your filters
          </p>
          <p className="text-sm text-slate-500">
            Clear your search or choose another resource type.
          </p>
          {canPublish && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="px-4 py-2 rounded-md bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800"
            >
              Share Resource
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Uploaded By</th>
                <th className="py-3 px-4 text-right">Downloads</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.map((res) => {
                const allowManage = canDeleteContent(
                  user.role,
                  res.uploadedById,
                  user.id
                );
                return (
                  <tr key={res.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="font-semibold text-slate-900">{res.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {res.description}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {res.courseCode}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {res.resourceType} · {res.fileSizeLabel}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap tabular-nums">
                      {res.uploadedByName} · {formatShortDate(res.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {res.downloadCount}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewResource(res)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(res)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-900 text-xs font-medium text-white hover:bg-slate-800"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Download</span>
                        </button>
                        {allowManage && (
                          <button
                            type="button"
                            aria-label={`Delete resource "${res.title}"`}
                            onClick={() => handleDelete(res.id)}
                            className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewResource && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-resource-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-blue-700">
                  {previewResource.courseCode} · {previewResource.resourceType} ·{' '}
                  {previewResource.department}
                </p>
                <h2
                  id="preview-resource-title"
                  className="font-display text-lg font-bold text-slate-900"
                >
                  {previewResource.title}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => setPreviewResource(null)}
                className="p-1.5 rounded text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-sm text-slate-600">{previewResource.description}</p>

            <pre className="bg-slate-50 border border-slate-200 rounded-md p-4 text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-80 overflow-y-auto">
              {previewResource.contentBody}
            </pre>

            <div className="flex items-center justify-between gap-4 pt-2">
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {previewResource.fileName} · {previewResource.fileSizeLabel} ·{' '}
                {previewResource.downloadCount} downloads
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewResource(null)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(previewResource)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Download File</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Resource Modal */}
      {createModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-resource-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="share-resource-title"
                className="font-display text-lg font-bold text-slate-900"
              >
                Share Academic Resource
              </h2>
              <button
                type="button"
                aria-label="Close modal"
                onClick={onCloseCreateModal}
                className="p-1.5 rounded text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {formError && (
              <p
                role="alert"
                className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {formError}
              </p>
            )}

            <form onSubmit={handleCreateResource} className="space-y-4">
              <div>
                <label
                  htmlFor="res-title"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Resource Title
                </label>
                <input
                  id="res-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., CS-301 Unit 3 Design Patterns Summary"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="res-type"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Type
                  </label>
                  <select
                    id="res-type"
                    value={newType}
                    onChange={(e) =>
                      setNewType(
                        e.target.value as AcademicResource['resourceType']
                      )
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Syllabus">Syllabus</option>
                    <option value="Lab Manual">Lab Manual</option>
                    <option value="Campus Form">Campus Form</option>
                    <option value="Past Paper">Past Paper</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="res-code"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Course Code
                  </label>
                  <input
                    id="res-code"
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label
                    htmlFor="res-dept"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Department
                  </label>
                  <input
                    id="res-dept"
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="res-filename"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  File Name
                </label>
                <input
                  id="res-filename"
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="res-desc"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Summary Description
                </label>
                <input
                  id="res-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="res-content"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Document Content
                </label>
                <textarea
                  id="res-content"
                  rows={4}
                  value={contentBody}
                  onChange={(e) => setContentBody(e.target.value)}
                  placeholder="Paste lecture notes, syllabus outline, or lab instructions…"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCloseCreateModal}
                  className="px-4 py-2 rounded-md border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {submitting ? 'Uploading…' : 'Publish Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
