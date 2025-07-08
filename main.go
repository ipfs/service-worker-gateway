// main.go
package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"net/url"
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

// redirectToHelia sends `302 /#helia-sw=<escaped original path, query, and hash>`
func redirectToHelia(w http.ResponseWriter, r *http.Request) {
	target := "/#helia-sw=" + url.QueryEscape(r.URL.RequestURI())
	http.Redirect(w, r, target, http.StatusFound)
}

// -----------------------------------------------------------------------------
// Custom handler for /ipfs/* and /ipns/*
// -----------------------------------------------------------------------------

func ipfsLikeHandler(w http.ResponseWriter, r *http.Request) {
	if fileExists(r.URL.Path) {
		// Serve the embedded file.
		distHandler.ServeHTTP(w, r)
		return
	}
	// Otherwise hand off to the SW via redirect.
	redirectToHelia(w, r)
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------

func main() {
	mux := http.NewServeMux()

	// Special‑case IPFS/IPNS paths.
	mux.HandleFunc("/ipfs/", ipfsLikeHandler)
	mux.HandleFunc("/ipns/", ipfsLikeHandler)

	// Everything else from dist/ (root path “/” included).
	mux.Handle("/", distHandler)

	addr := ":3000"
	log.Printf("Service Worker Gateway listening on %s", addr)
	log.Printf("Open http://gateway.localhost%s in your browser", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
