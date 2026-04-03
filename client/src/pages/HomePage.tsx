import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from '../i18n/useTranslation'

export default function HomePage() {
  const { t, tWithParams } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [heroBg, setHeroBg] = useState(0)

  const heroImages = [
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1920&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80',
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1920&q=80',
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1920&q=80',
  ]

  useEffect(() => {
    const timer = setInterval(() => setHeroBg((i) => (i + 1) % heroImages.length), 6000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const features = [
    { icon: '⚡', title: t('homepageV2.featureCards.liveTitle'), desc: t('homepageV2.featureCards.liveDesc'), color: 'from-blue-500 to-cyan-400', border: 'border-blue-500/30', glow: 'rgba(59,130,246,0.15)' },
    { icon: '📖', title: t('homepageV2.featureCards.readingTitle'), desc: t('homepageV2.featureCards.readingDesc'), color: 'from-violet-500 to-purple-400', border: 'border-violet-500/30', glow: 'rgba(139,92,246,0.15)' },
    { icon: '📊', title: t('homepageV2.featureCards.analyticsTitle'), desc: t('homepageV2.featureCards.analyticsDesc'), color: 'from-pink-500 to-rose-400', border: 'border-pink-500/30', glow: 'rgba(236,72,153,0.15)' },
    { icon: '🎙️', title: t('homepageV2.featureCards.speakingTitle'), desc: t('homepageV2.featureCards.speakingDesc'), color: 'from-emerald-500 to-green-400', border: 'border-emerald-500/30', glow: 'rgba(52,211,153,0.15)' },
    { icon: '📦', title: t('homepageV2.featureCards.packTitle'), desc: t('homepageV2.featureCards.packDesc'), color: 'from-amber-500 to-orange-400', border: 'border-amber-500/30', glow: 'rgba(245,158,11,0.15)' },
    { icon: '🔒', title: t('homepageV2.featureCards.securityTitle'), desc: t('homepageV2.featureCards.securityDesc'), color: 'from-slate-400 to-slate-300', border: 'border-slate-400/30', glow: 'rgba(148,163,184,0.12)' },
  ]

  const steps = [
    { num: '01', icon: t('homepageV2.steps.teacherIcon'), title: t('homepage.teacherCreate'), desc: t('homepage.teacherCreateDesc'), gradient: 'from-blue-500 to-indigo-600' },
    { num: '02', icon: t('homepageV2.steps.studentIcon'), title: t('homepage.studentJoin'), desc: t('homepage.studentJoinDesc'), gradient: 'from-violet-500 to-purple-600' },
    { num: '03', icon: t('homepageV2.steps.startIcon'), title: t('homepage.startInteractive'), desc: t('homepage.startInteractiveDesc'), gradient: 'from-emerald-500 to-teal-600' },
  ]

  const liveBullets = [
    { label: t('homepageV2.liveBullets.progressLabel'), desc: t('homepageV2.liveBullets.progressDesc') },
    { label: t('homepageV2.liveBullets.finishLabel'), desc: t('homepageV2.liveBullets.finishDesc') },
    { label: t('homepageV2.liveBullets.answerLabel'), desc: t('homepageV2.liveBullets.answerDesc') },
  ]

  const stats = [
    { value: '10+', label: '题型支持' },
    { value: '<1s', label: '实时延迟' },
    { value: 'AI', label: '智能评测' },
    { value: '∞', label: '无设备限制' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-x-hidden">
      {/* ===== NAV ===== */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#0a0e1a]/90 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-white/5' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <img src="/logo.png" alt="" className="w-9 h-9 rounded-xl" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">胖鼠互动课堂</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
              {t('homepage.hero.login')}
            </Link>
            <Link to="/register" className="px-5 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:-translate-y-0.5">
              {t('homepage.hero.startFree')}
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background carousel */}
        {heroImages.map((url, i) => (
          <img
            key={url}
            src={url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms]"
            style={{ opacity: i === heroBg ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a]/70 via-[#0a0e1a]/60 to-[#0a0e1a]/90" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Floating gradient blobs */}
        <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] hero-blob-1" />
        <div className="absolute top-[40%] right-[5%] w-[400px] h-[400px] rounded-full bg-violet-600/20 blur-[100px] hero-blob-2" />
        <div className="absolute bottom-[10%] left-[30%] w-[350px] h-[350px] rounded-full bg-cyan-500/15 blur-[100px] hero-blob-3" />

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] text-slate-400 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {t('homepageV2.heroBadge')}
          </div>

          <h1 className="fade-in-up-delay-1 text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            <span className="text-white">{t('homepage.hero.title')}</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              {t('homepage.hero.subtitle')}
            </span>
          </h1>

          <p className="fade-in-up-delay-2 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('homepage.hero.description')}
          </p>

          <div className="fade-in-up-delay-3 flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Link to="/register" className="group px-8 py-4 bg-white text-[#0a0e1a] rounded-2xl font-bold text-lg shadow-2xl shadow-white/10 hover:shadow-white/20 transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2">
              {t('homepage.hero.startFree')}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <Link to="/login" className="px-8 py-4 bg-white/[0.06] backdrop-blur-sm text-white rounded-2xl font-semibold text-lg border border-white/[0.1] hover:bg-white/[0.1] transition-all duration-300">
              {t('homepage.hero.login')}
            </Link>
          </div>

          {/* Stats bar */}
          <div className="fade-in-up-delay-3 flex flex-wrap justify-center gap-6 md:gap-10">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-sm">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{stat.value}</span>
                <span className="text-slate-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0e1a] to-transparent" />
      </section>

      {/* ===== FEATURES ===== */}
      <section className="relative py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-semibold mb-4 border border-blue-500/20">{t('homepage.coreFeatures')}</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('homepageV2.whyChoose')}</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">{t('homepage.featureDesc')}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`group relative rounded-2xl bg-white/[0.03] backdrop-blur-sm border ${feature.border} p-7 hover:bg-white/[0.06] transition-all duration-500 hover:-translate-y-1`}
                style={{ boxShadow: `0 0 0 0 ${feature.glow}` }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${feature.glow}` }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${feature.glow}` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl mb-4 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LIVE CLASSROOM SHOWCASE ===== */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: text */}
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-semibold mb-6 border border-emerald-500/20">{t('homepageV2.liveReplay')}</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                {t('homepageV2.liveHeading')}
              </h2>
              <p className="text-2xl text-slate-500 mb-6">{t('homepageV2.liveSubheading')}</p>
              <p className="text-slate-400 mb-10 leading-relaxed">{t('homepageV2.liveDescription')}</p>
              <div className="space-y-5">
                {liveBullets.map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{item.label}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: interactive mockup */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-violet-600/20 rounded-3xl blur-3xl" />
              <div className="relative bg-[#111827] rounded-2xl shadow-2xl overflow-hidden border border-white/[0.06]">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  <span className="ml-2 text-xs text-slate-600">{t('homepageV2.classroomWindowTitle')}</span>
                </div>

                <div className="p-6 space-y-5">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-semibold">{t('homepageV2.liveCardTitle')}</h4>
                      <p className="text-slate-500 text-sm">{t('homepageV2.liveCardStatus')}</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 text-sm rounded-full font-medium border border-emerald-500/20">
                      {tWithParams('homepageV2.liveSubmitted', { submitted: 28, total: 32 })}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full w-[87.5%] bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" />
                  </div>

                  {/* Question mockup */}
                  <div className="p-5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                    <p className="text-slate-300 text-sm mb-4">{t('homepageV2.liveCardQuestion')}</p>
                    <div className="space-y-2.5">
                      {[
                        { key: 'A', text: 'A greeting', correct: true },
                        { key: 'B', text: 'A goodbye' },
                        { key: 'C', text: 'An apology' },
                      ].map((opt) => (
                        <div
                          key={opt.key}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${opt.correct ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'}`}
                        >
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${opt.correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.06] text-slate-500'}`}>
                            {opt.key}
                          </span>
                          <span className={`text-sm ${opt.correct ? 'text-emerald-300' : 'text-slate-400'}`}>{opt.text}</span>
                          {opt.correct && <span className="ml-auto text-emerald-400 text-xs font-medium">✓ {t('homepageV2.correctAnswerTag')}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-slate-600">
                      {t('homepageV2.classAccuracy')} <span className="text-emerald-400 font-semibold">87%</span>
                    </div>
                    <button className="px-4 py-2 bg-red-500/15 text-red-400 text-sm rounded-lg hover:bg-red-500/25 transition-colors border border-red-500/20">
                      {t('homepageV2.endTask')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 text-violet-400 text-sm font-semibold mb-4 border border-violet-500/20">{t('homepage.usageProcess')}</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('homepage.threeSteps')}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-blue-500/50 via-violet-500/50 to-emerald-500/50" />

            {steps.map((step) => (
              <div key={step.num} className="relative text-center group">
                <div className="relative inline-flex mb-6">
                  <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-4xl shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-[#0a0e1a] border-2 border-white/10 flex items-center justify-center text-xs font-bold text-slate-400 shadow-lg">{step.num}</div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TEACHER & STUDENT ===== */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('homepage.designedFor')}</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">{t('homepage.featureDesc')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Teacher card */}
            <div className="group relative rounded-2xl bg-gradient-to-br from-blue-500/[0.08] to-transparent border border-blue-500/20 p-8 hover:border-blue-500/40 transition-all duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20">{t('homepageV2.steps.teacherIcon')}</div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{t('homepageV2.teacherTitle')}</h3>
                  <p className="text-slate-500 text-sm">{t('homepageV2.teacherDashboard')}</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[t('homepageV2.teacherFeatures.prepare'), t('homepageV2.teacherFeatures.live'), t('homepageV2.teacherFeatures.analytics'), t('homepageV2.teacherFeatures.ai')].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-slate-300 text-sm">
                    <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Student card */}
            <div className="group relative rounded-2xl bg-gradient-to-br from-violet-500/[0.08] to-transparent border border-violet-500/20 p-8 hover:border-violet-500/40 transition-all duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-violet-500/20">{t('homepageV2.steps.studentIcon')}</div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{t('homepageV2.studentTitle')}</h3>
                  <p className="text-slate-500 text-sm">{t('homepageV2.studentDashboard')}</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[t('homepageV2.studentFeatures.join'), t('homepageV2.studentFeatures.submit'), t('homepageV2.studentFeatures.pack'), t('homepageV2.studentFeatures.report')].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-slate-300 text-sm">
                    <div className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-violet-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-violet-600 to-pink-600" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '30px 30px',
        }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">{t('homepageV2.freeTrialTitle')}</h2>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">{t('homepageV2.freeTrialDescription')}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register" className="px-8 py-4 bg-white text-[#0a0e1a] rounded-2xl font-bold text-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
              {t('homepageV2.registerNow')}
            </Link>
            <Link to="/free" className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-2xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300">
              {t('homepageV2.browseFreePractice')}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#060810] py-12 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg" />
              </div>
              <span className="font-semibold text-white">胖鼠互动课堂</span>
            </div>
            <p className="text-slate-600 text-sm">{t('homepageV2.footerCopyright')}</p>
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <Link to="/login" className="hover:text-white transition-colors">{t('homepageV2.footerLogin')}</Link>
              <Link to="/register" className="hover:text-white transition-colors">{t('homepageV2.footerRegister')}</Link>
              <Link to="/free" className="hover:text-white transition-colors">{t('homepageV2.footerFreePractice')}</Link>
            </div>
          </div>
          {/* ICP 备案号 */}
          <div className="mt-6 pt-6 border-t border-white/[0.04] text-center">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 text-xs hover:text-slate-400 transition-colors"
            >
              陕ICP备16018355号-4
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
