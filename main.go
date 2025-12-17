// main.go
package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"path"
	"strings"
)

// -----------------------------------------------------------------------------
// Embed static assets
// -----------------------------------------------------------------------------

//go:embed dist/*
var staticFiles embed.FS

var (
	distFS      fs.FS
	distHandler http.Handler
)

func init() {
	var err error
	// Restrict to the "dist" subtree.
	distFS, err = fs.Sub(staticFiles, "dist")
	if err != nil {
		log.Fatalf("failed to isolate embedded dist/: %v", err)
	}
	distHandler = http.FileServer(http.FS(distFS))
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

// fileExists reports whether a file (or index.html in a directory) is present.
func fileExists(p string) bool {
	// Strip leading '/' because fs.Stat works with relative paths.
	clean := strings.TrimPrefix(path.Clean(p), "/")

	// Try exact file.
	if _, err := fs.Stat(distFS, clean); err == nil {
		return true
	}
	// Try directory + "index.html".
	if _, err := fs.Stat(distFS, path.Join(clean, "index.html")); err == nil {
		return true
	}
	return false
}

// -----------------------------------------------------------------------------
// Custom handler for /ipfs/* and /ipns/*
// -----------------------------------------------------------------------------

func ipfsLikeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Add("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")

	if fileExists(r.URL.Path) {
		// Serve the asset
		distHandler.ServeHTTP(w, r)
		return
	}

	// Otherwise serve the index file
	http.ServeFile(w, r, "dist/index.html")
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------

func main() {
	mux := http.NewServeMux()

	// Special‑case IPFS/IPNS paths.
	mux.HandleFunc("/ipfs/", ipfsLikeHandler)
	mux.HandleFunc("/ipns/", ipfsLikeHandler)

	// Everything else - check if file exists, otherwise redirect to SW
	mux.HandleFunc("/", ipfsLikeHandler)

	addr := ":3000"
	log.Printf("Service Worker Gateway listening on %s", addr)
	log.Printf("Open http://gateway.localhost%s in your browser", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
