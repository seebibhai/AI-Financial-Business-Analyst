import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenText } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mb-4">
        <BookOpenText size={20} className="text-ink-400" />
      </div>
      <h1 className="font-display text-2xl text-ink-900 mb-2">Page not found</h1>
      <p className="text-sm text-ink-500 mb-6">This page doesn't exist, or you don't have access to it.</p>
      <Link to="/" className="btn-primary">Back to home</Link>
    </div>
  );
}
