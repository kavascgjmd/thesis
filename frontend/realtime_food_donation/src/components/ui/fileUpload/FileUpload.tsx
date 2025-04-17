import React, { useState, useRef } from 'react'

interface FileUploadProps {
  onChange: (file: File | null) => void
  currentFile?: File | null
  accept?: string
  disabled?: boolean
  error?: string
  previewUrl?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onChange,
  currentFile,
  accept = '*/*',
  disabled = false,
  error,
  previewUrl
}) => {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const fileName = currentFile ? currentFile.name : ''

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0] && !disabled) {
      onChange(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0])
    }
  }

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.click()
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  // Check if we have a preview to display
  const hasPreview = Boolean(previewUrl) || Boolean(fileName)

  return (
    <div>
      <div 
        className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : error ? 'border-red-500' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-blue-50'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={disabled ? undefined : handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
        
        {hasPreview ? (
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center">
              {previewUrl && previewUrl.startsWith('data:image/') ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-10 h-10 object-cover mr-2 rounded"
                />
              ) : (
                <svg className="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span className="text-sm truncate max-w-xs">
                {fileName || (previewUrl ? 'Uploaded file' : '')}
              </span>
            </div>
            
            {!disabled && (
              <button 
                type="button" 
                onClick={handleRemove}
                className="text-red-500 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <>
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path 
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
                strokeWidth={2} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
            <div className="flex text-sm text-gray-600 mt-2 justify-center">
              <label
                htmlFor="file-upload"
                className={`relative cursor-pointer rounded-md font-medium ${disabled ? 'text-gray-400' : 'text-blue-600 hover:text-blue-500'}`}
              >
                <span>Upload a file</span>
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">
              {accept === 'image/*,application/pdf' ? 'PNG, JPG, GIF, PDF up to 10MB' : 
               accept === 'image/*' ? 'PNG, JPG, GIF up to 10MB' : 
               'Files up to 10MB'}
            </p>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}