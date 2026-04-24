import React from 'react'
import ReactDOM from 'react-dom/client'
import LodgitAuth from './LodgitAuth'
import Lodgit from './Lodgit'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LodgitAuth>
      {({ session, workspace, onSignOut }) => (
        <Lodgit 
          session={session} 
          workspace={workspace} 
          onSignOut={onSignOut} 
        />
      )}
    </LodgitAuth>
  </React.StrictMode>
)
