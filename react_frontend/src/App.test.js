import { render, screen } from '@testing-library/react';
import App from './App';

test('renders header title Social Identity Finder', () => {
  render(<App />);
  const title = screen.getByText(/Social Identity Finder/i);
  expect(title).toBeInTheDocument();
});
