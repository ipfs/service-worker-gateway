// main.go
package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync"
)

// ----------------------------------------------------------------------------
// Embedding static assets
// ----------------------------------------------------------------------------

//go:embed dist/*
var staticFiles embed.FS

// makeStaticHandler returns an HTTP handler that serves files from the provided filesystem.
func makeStaticHandler(fsys fs.FS) http.Handler {
	// http.FileServer will automatically serve index.html when "/" is requested.
	return http.FileServer(http.FS(fsys))
}

// staticFileHandler constructs a handler for the embedded "dist" directory.
func staticFileHandler() http.Handler {
	// Use fs.Sub to restrict the embedded filesystem to the "dist" folder.
	distFS, err := fs.Sub(staticFiles, "dist")
	if err != nil {
		log.Fatalf("failed to get sub filesystem: %v", err)
	}
	return makeStaticHandler(distFS)
}

// ----------------------------------------------------------------------------
// Reverse Proxy
// ----------------------------------------------------------------------------

// newReverseProxy returns a reverse proxy that forwards all requests to the target URL.
func newReverseProxy(target string) *httputil.ReverseProxy {
	backendURL, err := url.Parse(target)
	if err != nil {
		log.Fatalf("invalid target URL: %v", err)
	}
	return httputil.NewSingleHostReverseProxy(backendURL)
}

// ----------------------------------------------------------------------------
// Servers
// ----------------------------------------------------------------------------

// startStaticServer starts an HTTP server to serve static files on the given address.
func startStaticServer(addr string, wg *sync.WaitGroup) {
	defer wg.Done()
	log.Printf("Starting static file server on %s", addr)
	if err := http.ListenAndServe(addr, staticFileHandler()); err != nil {
		log.Fatalf("static server error: %v", err)
	}
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------

func main() {
	var wg sync.WaitGroup
	wg.Add(2)

	// Start the static file server on port 3000.
	go startStaticServer(":3000", &wg)

	wg.Wait()
}
