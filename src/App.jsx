import { useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'
import { auth, db, isFirebaseConfigured } from './firebase'

const heroSlides = [
  {
    image:
      'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1600&q=80',
    title: 'Taste Summer Anytime',
    description:
      'Handpicked mangoes from trusted orchards, delivered fresh to your doorstep.',
    cta: 'Buy Now',
    target: '#mangoes',
  },
  {
    image:
      'https://images.unsplash.com/photo-1630332452859-7d6cfb6f2ce2?auto=format&fit=crop&w=1600&q=80',
    title: 'From Orchard to Home',
    description:
      'Experience vibrant tropical flavor and premium quality in every bite.',
    cta: 'Buy Mangoes',
    target: '#mangoes',
  },
  {
    image:
      'https://images.unsplash.com/photo-1621886292650-5206dc4f267e?auto=format&fit=crop&w=1600&q=80',
    title: 'Share Mango Moments',
    description:
      'Celebrate family gatherings and weekend treats with nature-inspired sweetness.',
    cta: 'Shop Fresh',
    target: '#mangoes',
  },
  {
    image:
      'https://images.unsplash.com/photo-1568707043650-eb03f2536825?auto=format&fit=crop&w=1600&q=80',
    title: 'Rent Your Own Mango Tree',
    description:
      'Adopt a tree for seasonal harvests, eco-friendly farming, and orchard joy.',
    cta: 'Rent a Tree',
    target: '#rentals',
  },
]

const mangoTypes = [
  {
    name: 'Alphonso',
    description: 'Rich aroma, buttery texture, and naturally sweet finish.',
    price: 'Rs. 899 / box',
    image:
      'https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Kesar',
    description: 'Saffron-hued pulp with floral notes and smooth sweetness.',
    price: 'Rs. 749 / box',
    image:
      'https://images.unsplash.com/photo-1622803556203-8fc4d3f5f2b5?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Dasheri',
    description: 'Juicy and fragrant favorite for shakes and desserts.',
    price: 'Rs. 699 / box',
    image:
      'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Langra',
    description: 'Tangy-sweet profile, fiber-light pulp, and deep flavor.',
    price: 'Rs. 679 / box',
    image:
      'https://images.unsplash.com/photo-1655198693787-f85fbf7590f4?auto=format&fit=crop&w=800&q=80',
  },
]

const rentals = [
  {
    name: 'Sunrise Orchard Tree',
    duration: '3-month seasonal rental',
    benefits: 'Fresh harvest updates, organic care, and doorstep delivery.',
    image:
      'https://images.unsplash.com/photo-1604582755526-614f7f9f89a5?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Golden Canopy Tree',
    duration: '6-month premium rental',
    benefits: 'Priority fruit share with tree growth tracking.',
    image:
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Family Harvest Grove',
    duration: '4-month family package',
    benefits: 'Seasonal harvest basket and farm-to-home freshness.',
    image:
      'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Eco Bloom Tree',
    duration: 'Annual flexible rental',
    benefits: 'Sustainable cultivation and surprise orchard gifts.',
    image:
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
  },
]

const testimonials = [
  {
    name: 'Riya S.',
    text: 'The mangoes were incredibly fresh and the flavor reminded me of childhood summers.',
  },
  {
    name: 'Amit R.',
    text: 'Tree rental updates are fun and transparent. It feels like I own a mini orchard.',
  },
  {
    name: 'Neha K.',
    text: 'Beautiful packaging, quick delivery, and great customer support every season.',
  },
]

const WA_PHONE_NUMBER = '919999999999'
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getWhatsAppUrl(productName) {
  const message = `Hello Mango Garden! I want to order ${productName}.`
  return `https://wa.me/${WA_PHONE_NUMBER}?text=${encodeURIComponent(message)}`
}

function AuthModal({ mode, onClose, onSubmit, loading, form, setForm }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
        <h3>{mode === 'login' ? 'Login' : 'Create account'}</h3>
        <p>Use your email and password to continue.</p>
        <form onSubmit={onSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  )
}

function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [feedback, setFeedback] = useState({ name: '', email: '', message: '' })
  const [feedbackErrors, setFeedbackErrors] = useState({})
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!auth) {
      return undefined
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser))
    return () => unsubscribe()
  }, [])

  const welcomeMessage = useMemo(() => {
    if (!user) {
      return 'Logged out'
    }
    return `Welcome to Mango Garden 🍋, ${user.email}`
  }, [user])

  const validateFeedback = () => {
    const errors = {}
    if (!feedback.name.trim()) errors.name = 'Name is required'
    if (!feedback.email.trim()) {
      errors.email = 'Email is required'
    } else if (!emailRegex.test(feedback.email)) {
      errors.email = 'Enter a valid email'
    }
    if (!feedback.message.trim()) errors.message = 'Message is required'
    setFeedbackErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    if (!isFirebaseConfigured || !auth) {
      toast.error('Firebase is not configured. Add env values first.')
      return
    }
    if (!emailRegex.test(authForm.email)) {
      toast.error('Please enter a valid email.')
      return
    }
    if (authForm.password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    setAuthLoading(true)
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password)
        toast.success('Logged in successfully.')
      } else {
        await createUserWithEmailAndPassword(auth, authForm.email, authForm.password)
        toast.success('Account created successfully.')
      }
      setAuthMode('')
      setAuthForm({ email: '', password: '' })
    } catch (error) {
      toast.error(error.message || 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!auth) return
    try {
      await signOut(auth)
      toast.success('Logged out.')
    } catch (error) {
      toast.error(error.message || 'Logout failed.')
    }
  }

  const submitFeedback = async (event) => {
    event.preventDefault()
    if (!validateFeedback()) {
      return
    }
    if (!isFirebaseConfigured || !db) {
      toast.error('Firebase Firestore is not configured.')
      return
    }
    setFeedbackLoading(true)
    try {
      await addDoc(collection(db, 'feedback'), {
        ...feedback,
        createdAt: serverTimestamp(),
      })
      setFeedback({ name: '', email: '', message: '' })
      setFeedbackErrors({})
      toast.success('Thank you for your feedback 🌿')
    } catch (error) {
      toast.error(error.message || 'Failed to submit feedback.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="navbar">
        <nav className="nav-shell">
          <ul className="nav-links">
            <li>
              <a href="#about">About</a>
            </li>
            <li>
              <a href="#contact">Contact</a>
            </li>
            <li>
              <a href="#feedback">Feedback</a>
            </li>
          </ul>
          <a href="#" className="brand" aria-label="Mango Garden home">
            <span className="brand-icon" aria-hidden="true">
              🌿
            </span>
            <span>Mango Garden</span>
          </a>
          <ul className="nav-actions">
            <li>
              <a className="action-link" href="#mangoes">
                Buy Mangoes
              </a>
            </li>
            <li>
              <a className="action-link solid" href="#rentals">
                Rent a Tree
              </a>
            </li>
            {!user ? (
              <>
                <li>
                  <button className="action-link auth-btn" onClick={() => setAuthMode('login')}>
                    Login
                  </button>
                </li>
                <li>
                  <button className="action-link auth-btn" onClick={() => setAuthMode('signup')}>
                    Sign Up
                  </button>
                </li>
              </>
            ) : (
              <li>
                <button className="action-link auth-btn" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            )}
          </ul>
        </nav>
      </header>

      <main>
        <section className="auth-status">
          <p>{welcomeMessage}</p>
          <Link className="admin-link" to="/orchard-admin">
            Admin
          </Link>
        </section>
        <section className="hero-carousel">
          <div
            className="hero-track"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {heroSlides.map((slide) => (
              <article className="hero-slide" key={slide.title}>
                <img src={slide.image} alt={slide.title} />
                <div className="hero-overlay" />
                <div className="hero-content">
                  <h1>{slide.title} 🍋</h1>
                  <p>{slide.description}</p>
                  <a href={slide.target} className="cta-button">
                    {slide.cta}
                  </a>
                </div>
              </article>
            ))}
          </div>
          <div className="dots" aria-label="Hero slides">
            {heroSlides.map((slide, idx) => (
              <button
                key={slide.title}
                onClick={() => setActiveSlide(idx)}
                className={`dot ${idx === activeSlide ? 'active' : ''}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </section>

        <section id="mangoes" className="content-section">
          <div className="section-heading">
            <h2>Mango Types</h2>
            <p>Choose from our most loved seasonal varieties.</p>
          </div>
          <div className="card-grid">
            {mangoTypes.map((mango) => (
              <article className="card" key={mango.name}>
                <img src={mango.image} alt={mango.name} />
                <div className="card-body">
                  <h3>{mango.name}</h3>
                  <p>{mango.description}</p>
                  <div className="card-row">
                    <strong>{mango.price}</strong>
                    <a
                      className="card-cta"
                      href={getWhatsAppUrl(`${mango.name} Mango Order`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Buy Now
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="rentals" className="content-section alt">
          <div className="section-heading">
            <h2>Mango Tree Rentals</h2>
            <p>Adopt a tree and enjoy fresh harvests with sustainable care.</p>
          </div>
          <div className="card-grid">
            {rentals.map((tree) => (
              <article className="card rental" key={tree.name}>
                <img src={tree.image} alt={tree.name} />
                <span className="badge">Eco Friendly 🌱</span>
                <div className="card-body">
                  <h3>{tree.name}</h3>
                  <p>{tree.duration}</p>
                  <p>{tree.benefits}</p>
                  <a
                    className="card-cta"
                    href={getWhatsAppUrl(`${tree.name} Tree Rental`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Rent Now
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="content-section">
          <div className="text-block">
            <h2>About Mango Garden</h2>
            <p>
              Mango Garden started with a simple mission: bring orchard-fresh
              mangoes to families while supporting sustainable farming.
            </p>
            <p>
              From carefully curated fruit boxes to tree rental experiences, we
              help you feel connected to nature in every season.
            </p>
          </div>
        </section>

        <section id="contact" className="content-section alt">
          <div className="section-heading">
            <h2>Contact Us</h2>
            <p>We are happy to help with orders, rentals, and questions.</p>
          </div>
          <form className="contact-form" onSubmit={submitFeedback}>
            <input
              type="text"
              placeholder="Name"
              aria-label="Name"
              value={feedback.name}
              onChange={(event) => setFeedback({ ...feedback, name: event.target.value })}
            />
            {feedbackErrors.name ? <small className="error">{feedbackErrors.name}</small> : null}
            <input
              type="email"
              placeholder="Email"
              aria-label="Email"
              value={feedback.email}
              onChange={(event) => setFeedback({ ...feedback, email: event.target.value })}
            />
            {feedbackErrors.email ? <small className="error">{feedbackErrors.email}</small> : null}
            <textarea
              placeholder="Message"
              rows="4"
              aria-label="Message"
              value={feedback.message}
              onChange={(event) => setFeedback({ ...feedback, message: event.target.value })}
            />
            {feedbackErrors.message ? <small className="error">{feedbackErrors.message}</small> : null}
            <button type="submit" disabled={feedbackLoading}>
              {feedbackLoading ? 'Submitting...' : 'Send Message'}
            </button>
          </form>
        </section>

        <section id="feedback" className="content-section">
          <div className="section-heading">
            <h2>Customer Feedback</h2>
            <p>What our community says about Mango Garden.</p>
          </div>
          <div className="testimonial-grid">
            {testimonials.map((item) => (
              <article className="testimonial" key={item.name}>
                <p>"{item.text}"</p>
                <strong>- {item.name}</strong>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-links">
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <a href="#feedback">Feedback</a>
        </div>
        <div className="footer-social" aria-label="Social media links">
          <span>📷</span>
          <span>👍</span>
          <span>🐦</span>
        </div>
        <p className="tagline">Bringing orchards to your home 🌿</p>
      </footer>
      {authMode ? (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode('')}
          onSubmit={handleAuthSubmit}
          loading={authLoading}
          form={authForm}
          setForm={setAuthForm}
        />
      ) : null}
      <ToastContainer position="top-right" autoClose={2500} />
    </div>
  )
}

function AdminPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFeedback = async () => {
      if (!db) {
        setLoading(false)
        return
      }
      const feedbackRef = collection(db, 'feedback')
      const q = query(feedbackRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    }
    loadFeedback().catch(() => setLoading(false))
  }, [])

  return (
    <section className="admin-page">
      <div className="admin-head">
        <h2>Feedback Admin</h2>
        <Link to="/" className="admin-back">
          Back to Home
        </Link>
      </div>
      {!isFirebaseConfigured ? <p>Add Firebase env keys to load data.</p> : null}
      {loading ? <p>Loading feedback...</p> : null}
      {!loading && items.length === 0 ? <p>No feedback submissions yet.</p> : null}
      <div className="admin-grid">
        {items.map((item) => (
          <article className="admin-card" key={item.id}>
            <h3>{item.name}</h3>
            <p>{item.email}</p>
            <p>{item.message}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/orchard-admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
