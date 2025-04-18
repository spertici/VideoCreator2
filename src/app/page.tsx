'use client';

import React from 'react';
import VideoForm from '../components/VideoForm';

export default function Home(): React.JSX.Element {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Soccer Team Video Generator
        </h1>
        <VideoForm />
      </div>
    </main>
  );
} 