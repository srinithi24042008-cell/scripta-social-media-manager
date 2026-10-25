import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Unhandled render error:', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        textAlign: 'center',
        fontFamily: 'inherit',
      }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Something went wrong</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          An unexpected error occurred. Please reload the page.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#4f46e5',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
