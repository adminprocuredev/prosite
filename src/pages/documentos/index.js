import React, { useEffect } from 'react'
import { useGoogleDrive } from 'src/context/google-drive-functions/useGoogleDrive'

const Documentos = () => {
  const {
    files,
    nextPageToken,
    prevPageTokens,
    currentPage,
    isLoading,
    error,
    fetchFiles,
    uploadFiles,
    nestedFiles,
    setNestedFiles,
    isFirstLoad,
    isSwitching,
    setIsSwitching
  } = useGoogleDrive()

  useEffect(() => {
    if (!isFirstLoad) {
      fetchFiles(nestedFiles ? '180lLMkkTSpFhHTYXBSBQjLsoejSmuXwt' : 'root')
    }
  }, [nestedFiles])

  const handleNextPage = () => {
    fetchFiles(nestedFiles ? '180lLMkkTSpFhHTYXBSBQjLsoejSmuXwt' : 'root', nextPageToken, 'next')
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const lastPageToken = prevPageTokens[prevPageTokens.length - 2]
      fetchFiles(nestedFiles ? '180lLMkkTSpFhHTYXBSBQjLsoejSmuXwt' : 'root', lastPageToken, 'prev')
    }
  }

  const handleSwitchChange = () => {
    setIsSwitching(true)
    setNestedFiles(!nestedFiles)
  }

  return (
    <div>
      <div className='pagination'>
        <button onClick={handlePrevPage} disabled={currentPage === 1}>
          Previous
        </button>
        <span>Page {currentPage}</span>
        <button onClick={handleNextPage} disabled={!nextPageToken}>
          Next
        </button>
      </div>

      <div>
        <label>
          <input type='checkbox' checked={nestedFiles} onChange={handleSwitchChange} />
          Nested Files
        </label>
      </div>
      <button onClick={() => fetchFiles(nestedFiles ? '180lLMkkTSpFhHTYXBSBQjLsoejSmuXwt' : 'root')}>
        Try sample request
      </button>
      <button onClick={() => document.getElementById('fileInput').click()}>Upload Files</button>
      <input
        type='file'
        id='fileInput'
        style={{ display: 'none' }}
        onChange={e => uploadFiles(e.target.files)}
        multiple
      />
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      <ul>
        {files.map(file => (
          <li key={file.id}>
            {file.id} - {file.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

Documentos.acl = {
  subject: 'documentos'
}

export default Documentos
