# Runtime

This folder is for runtime artifacts such as sqlite databases, WAL/SHM files, and other generated runtime state. Legacy flows may still write some of these files at the app root; new maintenance should gradually converge runtime artifacts here.
