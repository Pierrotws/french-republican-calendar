import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

// Astro code lifted from https://www.fourmilab.ch/documents/calendar/
// The copyright there states this code belongs to the public domain.
// Everything between BEGIN BORROWED CODE and up to END BORROWED CODE is
// therefore put in the public domain too. Modifications were made to
// put it in a more object-oriented form.

// BEGIN BORROWED CODE

class Astro {
    constructor() {
        this.cache = {};
        this.cachestamp = {};
    }

    rtd(r) {
        return (r * 180.0) / Math.PI;
    }
    dtr(d) {
        return (d * Math.PI) / 180.0;
    }
    dcos(d) {
        return Math.cos(this.dtr(d));
    }
    dsin(d) {
        return Math.sin(this.dtr(d));
    }
    fixangle(a) {
        return a - 360.0 * (Math.floor(a / 360.0));
    }
    fixangr(a) {
        return a - (2 * Math.PI) * (Math.floor(a / (2 * Math.PI)));
    }
    mod(a, b) {
        return a - (b * Math.floor(a / b));
    }

    /*  DELTAT  --  Determine the difference, in seconds, between
        Dynamical time and Universal time.  */
    deltat(year) {
        var dt, f, i, t;
        if ((year >= 1620) && (year <= 2000)) {
            i = Math.floor((year - 1620) / 2);
            f = ((year - 1620) / 2) - i;
            dt = Astro.deltaTtab[i] + ((Astro.deltaTtab[i + 1] - Astro.deltaTtab[i]) * f);
        } else {
            t = (year - 2000) / 100;
            if (year < 948) {
                dt = 2177 + (497 * t) + (44.1 * t * t);
            } else {
                dt = 102 + (102 * t) + (25.3 * t * t);
                if ((year > 2000) && (year < 2100)) {
                    dt += 0.37 * (year - 2100);
                }
            }
        }
        return dt;
    }

    equinox(year, which) {
        var deltaL, i, j, JDE0, JDE, JDE0tab, S, T, W, Y;
        if (year < 1000) {
            JDE0tab = Astro.JDE0tab1000;
            Y = year / 1000;
        } else {
            JDE0tab = Astro.JDE0tab2000;
            Y = (year - 2000) / 1000;
        }
        JDE0 = JDE0tab[which][0] +
            (JDE0tab[which][1] * Y) +
            (JDE0tab[which][2] * Y * Y) +
            (JDE0tab[which][3] * Y * Y * Y) +
            (JDE0tab[which][4] * Y * Y * Y * Y);
        T = (JDE0 - 2451545.0) / 36525;
        W = (35999.373 * T) - 2.47;
        deltaL = 1 + (0.0334 * this.dcos(W)) + (0.0007 * this.dcos(2 * W));
        S = 0;
        for (i = j = 0; i < 24; i++) {
            S += Astro.EquinoxpTerms[j] * this.dcos(Astro.EquinoxpTerms[j + 1] + (Astro.EquinoxpTerms[j + 2] * T));
            j += 3;
        }
        JDE = JDE0 + ((S * 0.00001) / deltaL);
        return JDE;
    }

    sunpos(jd) {
        var T, T2, L0, M, e, C, sunLong, sunAnomaly, sunR,
            Omega, Lambda, epsilon, epsilon0, Alpha, Delta,
            AlphaApp, DeltaApp;
        T = (jd - Astro.J2000) / Astro.JulianCentury;
        T2 = T * T;
        L0 = 280.46646 + (36000.76983 * T) + (0.0003032 * T2);
        L0 = this.fixangle(L0);
        M = 357.52911 + (35999.05029 * T) + (-0.0001537 * T2);
        M = this.fixangle(M);
        e = 0.016708634 + (-0.000042037 * T) + (-0.0000001267 * T2);
        C = ((1.914602 + (-0.004817 * T) + (-0.000014 * T2)) * this.dsin(M)) +
            ((0.019993 - (0.000101 * T)) * this.dsin(2 * M)) +
            (0.000289 * this.dsin(3 * M));
        sunLong = L0 + C;
        sunAnomaly = M + C;
        sunR = (1.000001018 * (1 - (e * e))) / (1 + (e * this.dcos(sunAnomaly)));
        Omega = 125.04 - (1934.136 * T);
        Lambda = sunLong + (-0.00569) + (-0.00478 * this.dsin(Omega));
        epsilon0 = this.obliqeq(jd);
        epsilon = epsilon0 + (0.00256 * this.dcos(Omega));
        Alpha = this.rtd(Math.atan2(this.dcos(epsilon0) * this.dsin(sunLong), this.dcos(sunLong)));
        Alpha = this.fixangle(Alpha);
        Delta = this.rtd(Math.asin(this.dsin(epsilon0) * this.dsin(sunLong)));
        AlphaApp = this.rtd(Math.atan2(this.dcos(epsilon) * this.dsin(Lambda), this.dcos(Lambda)));
        AlphaApp = this.fixangle(AlphaApp);
        DeltaApp = this.rtd(Math.asin(this.dsin(epsilon) * this.dsin(Lambda)));
        return [L0, M, e, C, sunLong, sunAnomaly, sunR, Lambda, Alpha, Delta, AlphaApp, DeltaApp];
    }

    obliqeq(jd) {
        var eps, u, v, i;
        v = u = (jd - Astro.J2000) / (Astro.JulianCentury * 100);
        eps = 23 + (26 / 60.0) + (21.448 / 3600.0);
        if (Math.abs(u) < 1.0) {
            for (i = 0; i < 10; i++) {
                eps += (Astro.oterms[i] / 3600.0) * v;
                v *= u;
            }
        }
        return eps;
    }

    nutation(jd) {
        var deltaPsi, deltaEpsilon,
            i, j,
            t = (jd - 2451545.0) / 36525.0, t2, t3, to10,
            ta = [],
            dp = 0, de = 0, ang;
        t3 = t * (t2 = t * t);
        ta[0] = this.dtr(297.850363 + 445267.11148 * t - 0.0019142 * t2 + t3 / 189474.0);
        ta[1] = this.dtr(357.52772 + 35999.05034 * t - 0.0001603 * t2 - t3 / 300000.0);
        ta[2] = this.dtr(134.96298 + 477198.867398 * t + 0.0086972 * t2 + t3 / 56250.0);
        ta[3] = this.dtr(93.27191 + 483202.017538 * t - 0.0036825 * t2 + t3 / 327270);
        ta[4] = this.dtr(125.04452 - 1934.136261 * t + 0.0020708 * t2 + t3 / 450000.0);
        for (i = 0; i < 5; i++) {
            ta[i] = this.fixangr(ta[i]);
        }
        to10 = t / 10.0;
        for (i = 0; i < 63; i++) {
            ang = 0;
            for (j = 0; j < 5; j++) {
                if (Astro.nutArgMult[(i * 5) + j] != 0) {
                    ang += Astro.nutArgMult[(i * 5) + j] * ta[j];
                }
            }
            dp += (Astro.nutArgCoeff[(i * 4) + 0] + Astro.nutArgCoeff[(i * 4) + 1] * to10) * Math.sin(ang);
            de += (Astro.nutArgCoeff[(i * 4) + 2] + Astro.nutArgCoeff[(i * 4) + 3] * to10) * Math.cos(ang);
        }
        deltaPsi = dp / (3600.0 * 10000.0);
        deltaEpsilon = de / (3600.0 * 10000.0);
        return [deltaPsi, deltaEpsilon];
    }

    equationOfTime(jd) {
        var alpha, deltaPsi, E, epsilon, L0, tau;
        tau = (jd - Astro.J2000) / Astro.JulianMillennium;
        L0 = 280.4664567 + (360007.6982779 * tau) +
            (0.03032028 * tau * tau) +
            ((tau * tau * tau) / 49931) +
            (-((tau * tau * tau * tau) / 15300)) +
            (-((tau * tau * tau * tau * tau) / 2000000));
        L0 = this.fixangle(L0);
        alpha = this.sunpos(jd)[10];
        deltaPsi = this.nutation(jd)[0];
        epsilon = this.obliqeq(jd) + this.nutation(jd)[1];
        E = L0 + (-0.0057183) + (-alpha) + (deltaPsi * this.dcos(epsilon));
        E = E - 20.0 * (Math.floor(E / 20.0));
        E = E / (24 * 60);
        return E;
    }

    gregorian_to_jd(year, month, day) {
        return (Astro.gregorianEpoch - 1) +
            (365 * (year - 1)) +
            Math.floor((year - 1) / 4) +
            (-Math.floor((year - 1) / 100)) +
            Math.floor((year - 1) / 400) +
            Math.floor((((367 * month) - 362) / 12) +
                ((month <= 2) ? 0 :
                    (this.leap_gregorian(year) ? -1 : -2)
                ) + day);
    }

    leap_gregorian(year) {
        return ((year % 4) == 0) &&
            (!(((year % 100) == 0) && ((year % 400) != 0)));
    }

    jd_to_gregorian(jd) {
        var wjd, depoch, quadricent, dqc, cent, dcent, quad, dquad, yindex, year, yearday, leapadj, month, day;

        wjd = Math.floor(jd - 0.5) + 0.5;
        depoch = wjd - Astro.gregorianEpoch;
        quadricent = Math.floor(depoch / 146097);
        dqc = this.mod(depoch, 146097);
        cent = Math.floor(dqc / 36524);
        dcent = this.mod(dqc, 36524);
        quad = Math.floor(dcent / 1461);
        dquad = this.mod(dcent, 1461);
        yindex = Math.floor(dquad / 365);
        year = (quadricent * 400) + (cent * 100) + (quad * 4) + yindex;
        if (!((cent == 4) || (yindex == 4))) {
            year++;
        }
        yearday = wjd - this.gregorian_to_jd(year, 1, 1);
        leapadj = ((wjd < this.gregorian_to_jd(year, 3, 1)) ? 0
            : (this.leap_gregorian(year) ? 1 : 2));
        month = Math.floor((((yearday + leapadj) * 12) + 373) / 367);
        day = (wjd - this.gregorian_to_jd(year, month, 1)) + 1;

        return [year, month, day];
    }

    equinoxe_a_paris(year) {
        var equJED, equJD, equAPP, equParis, dtParis;
        equJED = this.equinox(year, 2);
        equJD = equJED - (this.deltat(year) / (24 * 60 * 60));
        equAPP = equJD + this.equationOfTime(equJED);
        dtParis = (2 + (20 / 60.0) + (15 / (60 * 60.0))) / 360;
        equParis = equAPP + dtParis;
        return equParis;
    }

    paris_equinoxe_jd(year) {
        var ep, epg;
        ep = this.equinoxe_a_paris(year);
        epg = Math.floor(ep - 0.5) + 0.5;
        return epg;
    }

    anneeDeLaRevolution(jd) {
        var guess = this.jd_to_gregorian(jd)[0] - 2,
            lasteq, nexteq, adr;
        lasteq = this.paris_equinoxe_jd(guess);
        while (lasteq > jd) {
            guess--;
            lasteq = this.paris_equinoxe_jd(guess);
        }
        nexteq = lasteq - 1;
        while (!((lasteq <= jd) && (jd < nexteq))) {
            lasteq = nexteq;
            guess++;
            nexteq = this.paris_equinoxe_jd(guess);
        }
        adr = Math.round((lasteq - Astro.frenchRevolutionaryEpoch) / Astro.TropicalYear) + 1;
        return [adr, lasteq];
    }

    jd_to_french_revolutionary(jd) {
        var an, mois, decade, jour, adr, equinoxe;
        jd = Math.floor(jd) + 0.5;
        if (this.cachestamp['FRC'] == jd) {
            return this.cache['FRC'];
        }
        adr = this.anneeDeLaRevolution(jd);
        an = adr[0];
        equinoxe = adr[1];
        mois = Math.floor((jd - equinoxe) / 30) + 1;
        jour = (jd - equinoxe) % 30;
        decade = Math.floor(jour / 10) + 1;
        jour = (jour % 10) + 1;
        this.cachestamp['FRC'] = jd;
        this.cache['FRC'] = [an, mois, decade, jour];

        return this.cache['FRC'];
    }
}

Astro.J2000 = 2451545.0;
Astro.JulianCentury = 36525.0;
Astro.JulianMillennium = 36250;
Astro.AstronomicalUnit = 149597870.0;
Astro.TropicalYear = 365.24219878;
Astro.gregorianEpoch = 1721425.5;
Astro.frenchRevolutionaryEpoch = 2375839.5;

Astro.deltaTtab = [
    121, 112, 103, 95, 88, 82, 77, 72, 68, 63, 60, 56, 53, 51, 48, 46,
    44, 42, 40, 38, 35, 33, 31, 29, 26, 24, 22, 20, 18, 16, 14, 12,
    11, 10, 9, 8, 7, 7, 7, 7, 7, 7, 8, 8, 9, 9, 9, 9, 9, 10, 10, 10,
    10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 12, 12, 12, 12, 13, 13,
    13, 14, 14, 14, 14, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 16,
    16, 16, 15, 15, 14, 13, 13.1, 12.5, 12.2, 12, 12, 12, 12, 12, 12,
    11.9, 11.6, 11, 10.2, 9.2, 8.2, 7.1, 6.2, 5.6, 5.4, 5.3, 5.4, 5.6,
    5.9, 6.2, 6.5, 6.8, 7.1, 7.3, 7.5, 7.6, 7.7, 7.3, 6.2, 5.2, 2.7,
    1.4, -1.2, -2.8, -3.8, -4.8, -5.5, -5.3, -5.6, -5.7, -5.9, -6,
    -6.3, -6.5, -6.2, -4.7, -2.8, -0.1, 2.6, 5.3, 7.7, 10.4, 13.3, 16,
    18.2, 20.2, 21.1, 22.4, 23.5, 23.8, 24.3, 24, 23.9, 23.9, 23.7,
    24, 24.3, 25.3, 26.2, 27.3, 28.2, 29.1, 30, 30.7, 31.4, 32.2,
    33.1, 34, 35, 36.5, 38.3, 40.2, 42.2, 44.5, 46.5, 48.5, 50.5,
    52.2, 53.8, 54.9, 55.8, 56.9, 58.3, 60, 61.6, 63, 65, 66.6
];

Astro.EquinoxpTerms = [
    485, 324.96, 1934.136,
    203, 337.23, 32964.467,
    199, 342.08, 20.186,
    182, 27.85, 445267.112,
    156, 73.14, 45036.886,
    136, 171.52, 22518.443,
    77, 222.54, 65928.934,
    74, 296.72, 3034.906,
    70, 243.58, 9037.513,
    58, 119.81, 33718.147,
    52, 297.17, 150.678,
    50, 21.02, 2281.226,
    45, 247.54, 29929.562,
    44, 325.15, 31555.956,
    29, 60.93, 4443.417,
    18, 155.12, 67555.328,
    17, 288.79, 4562.452,
    16, 198.04, 62894.029,
    14, 199.76, 31436.921,
    12, 95.39, 14577.848,
    12, 287.11, 31931.756,
    12, 320.81, 34777.259,
    9, 227.73, 1222.114,
    8, 15.45, 16859.074
];

Astro.JDE0tab1000 = [
    [1721139.29189, 365242.13740, 0.06134, 0.00111, -0.00071],
    [1721233.25401, 365241.72562, -0.05323, 0.00907, 0.00025],
    [1721325.70455, 365242.49558, -0.11677, -0.00297, 0.00074],
    [1721414.39987, 365242.88257, -0.00769, -0.00933, -0.00006]
];

Astro.JDE0tab2000 = [
    [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
    [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.00030],
    [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
    [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032]
];

Astro.oterms = [-4680.93, -1.55, 1999.25, -51.38, -249.67, -39.05, 7.12, 27.87, 5.79, 2.45];

Astro.nutArgMult = [0, 0, 0, 0, 1, -2, 0, 0, 2, 2, 0, 0, 0, 2, 2, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, -2, 1, 0, 2, 2, 0, 0, 0, 2, 1, 0, 0, 1, 2, 2, -2, -1, 0, 2, 2, -2, 0, 1, 0, 0, -2, 0, 0, 2, 1, 0, 0, -1, 2, 2, 2, 0, 0, 0, 0, 0, 0, 1, 0, 1, 2, 0, -1, 2, 2, 0, 0, -1, 0, 1, 0, 0, 1, 2, 1, -2, 0, 2, 0, 0, 0, 0, -2, 2, 1, 2, 0, 0, 2, 2, 0, 0, 2, 2, 2, 0, 0, 2, 0, 0, -2, 0, 1, 2, 2, 0, 0, 0, 2, 0, -2, 0, 0, 2, 0, 0, 0, -1, 2, 1, 0, 2, 0, 0, 0, 2, 0, -1, 0, 1, -2, 2, 0, 2, 2, 0, 1, 0, 0, 1, -2, 0, 1, 0, 1, 0, -1, 0, 0, 1, 0, 0, 2, -2, 0, 2, 0, -1, 2, 1, 2, 0, 1, 2, 2, 0, 1, 0, 2, 2, -2, 1, 1, 0, 0, 0, -1, 0, 2, 2, 2, 0, 0, 2, 1, 2, 0, 1, 0, 0, -2, 0, 2, 2, 2, -2, 0, 1, 2, 1, 2, 0, -2, 0, 1, 2, 0, 0, 0, 1, 0, -1, 1, 0, 0, -2, -1, 0, 2, 1, -2, 0, 0, 0, 1, 0, 0, 2, 2, 1, -2, 0, 2, 0, 1, -2, 1, 0, 2, 1, 0, 0, 1, -2, 0, -1, 0, 1, 0, 0, -2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 2, 0, -1, -1, 1, 0, 0, 0, 1, 1, 0, 0, 0, -1, 1, 2, 2, 2, -1, -1, 2, 2, 0, 0, -2, 2, 2, 0, 0, 3, 2, 2, 2, -1, 0, 2, 2];

Astro.nutArgCoeff = [-171996, -1742, 92095, 89, -13187, -16, 5736, -31, -2274, -2, 977, -5, 2062, 2, -895, 5, 1426, -34, 54, -1, 712, 1, -7, 0, -517, 12, 224, -6, -386, -4, 200, 0, -301, 0, 129, -1, 217, -5, -95, 3, -158, 0, 0, 0, 129, 1, -70, 0, 123, 0, -53, 0, 63, 0, 0, 0, 63, 1, -33, 0, -59, 0, 26, 0, -58, -1, 32, 0, -51, 0, 27, 0, 48, 0, 0, 0, 46, 0, -24, 0, -38, 0, 16, 0, -31, 0, 13, 0, 29, 0, 0, 0, 29, 0, -12, 0, 26, 0, 0, 0, -22, 0, 0, 0, 21, 0, -10, 0, 17, -1, 0, 0, 16, 0, -8, 0, -16, 1, 7, 0, -15, 0, 9, 0, -13, 0, 7, 0, -12, 0, 6, 0, 11, 0, 0, 0, -10, 0, 5, 0, -8, 0, 3, 0, 7, 0, -3, 0, -7, 0, 0, 0, -7, 0, 3, 0, -7, 0, 3, 0, 6, 0, 0, 0, 6, 0, -3, 0, 6, 0, -3, 0, -6, 0, 3, 0, -6, 0, 3, 0, 5, 0, 0, 0, -5, 0, 3, 0, -5, 0, 3, 0, -5, 0, 3, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, -4, 0, 0, 0, -4, 0, 0, 0, -4, 0, 0, 0, 3, 0, 0, 0, -3, 0, 0, 0, -3, 0, 0, 0, -3, 0, 0, 0, -3, 0, 0, 0, -3, 0, 0, 0, -3, 0, 0, 0, -3, 0, 0, 0];

// END BORROWED CODE

const astro = new Astro();

const _monthNames = ['Vendémiaire', 'Brumaire', 'Frimaire', 'Nivôse', 'Pluviôse', 'Ventôse', 'Germinal', 'Floréal', 'Prairial', 'Messidor', 'Thermidor', 'Fructidor', 'Sans-culottides'];
const _sansculottidesNames = ['jour de la vertu', 'jour du génie', 'jour du travail', 'jour de l´opinion', 'jour des récompenses', 'jour de la révolution'];
const _dayNames = ['Primidi', 'Duodi', 'Tridi', 'Quartidi', 'Quintidi', 'Sextidi', 'Septidi', 'Octidi', 'Nonidi', 'Décadi'];
const _decadeNames = ['première', 'deuxième', 'troisième'];
const _saintsNames = [
    ['Raisin', 'Safran', 'Châtaigne', 'Colchique', 'Cheval', 'Balsamine', 'Carotte', 'Amaranthe', 'Panais', 'Cuve', 'Pomme de terre', 'Immortelle', 'Potiron', 'Réséda', 'Âne', 'Belle de nuit', 'Citrouille', 'Sarrasin', 'Tournesol', 'Pressoir', 'Chanvre', 'Pêche', 'Navet', 'Amaryllis', 'Bœuf', 'Aubergine', 'Piment', 'Tomate', 'Orge', 'Tonneau'],
    ['Pomme', 'Céleri', 'Poire', 'Betterave', 'Oie', 'Héliotrope', 'Figue', 'Scorsonère', 'Alisier', 'Charrue', 'Salsifis', 'Mâcre', 'Topinambour', 'Endive', 'Dindon', 'Chervis', 'Cresson', 'Dentelaire', 'Grenade', 'Herse', 'Bacchante', 'Azerole', 'Garance', 'Orange', 'Faisan', 'Pistache', 'Macjonc', 'Coing', 'Cormier', 'Rouleau'],
    ['Raiponce', 'Turneps', 'Chicorée', 'Nèfle', 'Cochon', 'Mâche', 'Chou-fleur', 'Miel', 'Genièvre', 'Pioche', 'Cire', 'Raifort', 'Cèdre', 'Sapin', 'Chevreuil', 'Ajonc', 'Cyprès', 'Lierre', 'Sabine', 'Hoyau', 'Érable sucré', 'Bruyère', 'Roseau', 'Oseille', 'Grillon', 'Pignon', 'Liège', 'Truffe', 'Olive', 'Pelle'],
    ['Tourbe', 'Houille', 'Bitume', 'Soufre', 'Chien', 'Lave', 'Terre végétale', 'Fumier', 'Salpêtre', 'Fléau', 'Granit', 'Argile', 'Ardoise', 'Grès', 'Lapin', 'Silex', 'Marne', 'Pierre à chaux', 'Marbre', 'Van', 'Pierre à plâtre', 'Sel', 'Fer', 'Cuivre', 'Chat', 'Étain', 'Plomb', 'Zinc', 'Mercure', 'Crible'],
    ['Lauréole', 'Mousse', 'Fragon', 'Perce-neige', 'Taureau', 'Laurier tin', 'Amadouvier', 'Mézéréon', 'Peuplier', 'Coignée', 'Ellébore', 'Brocoli', 'Laurier', 'Avelinier', 'Vache', 'Buis', 'Lichen', 'If', 'Pulmonaire', 'Serpette', 'Thlaspi', 'Thimele', 'Chiendent', 'Trainasse', 'Lièvre', 'Guède', 'Noisetier', 'Cyclamen', 'Chélidoine', 'Traîneau'],
    ['Tussilage', 'Cornouiller', 'Violier', 'Troène', 'Bouc', 'Asaret', 'Alaterne', 'Violette', 'Marceau', 'Bêche', 'Narcisse', 'Orme', 'Fumeterre', 'Vélar', 'Chèvre', 'Épinard', 'Doronic', 'Mouron', 'Cerfeuil', 'Cordeau', 'Mandragore', 'Persil', 'Cochléaria', 'Pâquerette', 'Thon', 'Pissenlit', 'Sylvie', 'Capillaire', 'Frêne', 'Plantoir'],
    ['Primevère', 'Platane', 'Asperge', 'Tulipe', 'Poule', 'Bette', 'Bouleau', 'Jonquille', 'Aulne', 'Couvoir', 'Pervenche', 'Charme', 'Morille', 'Hêtre', 'Abeille', 'Laitue', 'Mélèze', 'Ciguë', 'Radis', 'Ruche', 'Gainier', 'Romaine', 'Marronnier', 'Roquette', 'Pigeon', 'Lilas (commun)', 'Anémone', 'Pensée', 'Myrtile', 'Greffoir'],
    ['Rose', 'Chêne', 'Fougère', 'Aubépine', 'Rossignol', 'Ancolie', 'Muguet', 'Champignon', 'Hyacinthe', 'Râteau', 'Rhubarbe', 'Sainfoin', 'Bâton-d´or', 'Chamerops', 'Ver à soie', 'Consoude', 'Pimprenelle', 'Corbeille d´or', 'Arroche', 'Sarcloir', 'Statice', 'Fritillaire', 'Bourrache', 'Valériane', 'Carpe', 'Fusain', 'Civette', 'Buglosse', 'Sénevé', 'Houlette'],
    ['Luzerne', 'Hémérocalle', 'Trèfle', 'Angélique', 'Canard', 'Mélisse', 'Fromental', 'Martagon', 'Serpolet', 'Faux', 'Fraise', 'Bétoine', 'Pois', 'Acacia', 'Caille', 'Œillet', 'Sureau', 'Pavot', 'Tilleul', 'Fourche', 'Barbeau', 'Camomille', 'Chèvrefeuille', 'Caille-lait', 'Tanche', 'Jasmin', 'Verveine', 'Thym', 'Pivoine', 'Chariot'],
    ['Seigle', 'Avoine', 'Oignon', 'Véronique', 'Mulet', 'Romarin', 'Concombre', 'Échalote', 'Absinthe', 'Faucille', 'Coriandre', 'Artichaut', 'Girofle', 'Lavande', 'Chamois', 'Tabac', 'Groseille', 'Gesse', 'Cerise', 'Parc', 'Menthe', 'Cumin', 'Haricot', 'Orcanète', 'Pintade', 'Sauge', 'Ail', 'Vesce', 'Blé', 'Chalemie'],
    ['Épeautre', 'Bouillon-blanc', 'Melon', 'Ivraie', 'Bélier', 'Prêle', 'Armoise', 'Carthame', 'Mûre', 'Arrosoir', 'Panic', 'Salicorne', 'Abricot', 'Basilic', 'Brebis', 'Guimauve', 'Lin', 'Amande', 'Gentiane', 'Écluse', 'Carline', 'Câprier', 'Lentille', 'Aunée', 'Loutre', 'Myrte', 'Colza', 'Lupin', 'Coton', 'Moulin'],
    ['Prune', 'Millet', 'Lycoperdon', 'Escourgeon', 'Saumon', 'Tubéreuse', 'Sucrion', 'Apocyn', 'Réglisse', 'Échelle', 'Pastèque', 'Fenouil', 'Épine vinette', 'Noix', 'Truite', 'Citron', 'Cardère', 'Nerprun', 'Tagette', 'Hotte', 'Églantier', 'Noisette', 'Houblon', 'Sorgho', 'Écrevisse', 'Bigarade', 'Verge d´or', 'Maïs', 'Marron', 'Panier']
];

function _romanNumeral(n) {
    var val, s = '', limit = 3999, i = 0;
    var v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    var r = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    if (n < 1 || n > limit) return '';
    while (i < 13) {
        val = v[i];
        while (n >= val) {
            n -= val;
            s += r[i];
        }
        if (n == 0) return s;
        ++i;
    }
    return '';
}

const FrenchRepublicanCalendarTopMenu = GObject.registerClass(
    class FrenchRepublicanCalendarTopMenu extends PanelMenu.Button {
        _init() {
            super._init(0.5, 'FRC');
            this.offsetval = 0;
            this.offsetsign = 1;
            this.offsettext = '';
            this._timeoutId = 0;
            this.toptext = 'French Republican Calendar';
            let hbox = new St.BoxLayout({style_class: 'panel-status-menu-box'});
            hbox.add_child(new St.Label({
                text: '▾',
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            }));
            this.toplabel = new St.Label({
                text: this.toptext,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.toplabel.clutter_text.set_use_markup(true);
            hbox.add_child(this.toplabel);
            this.add_child(hbox);

            const upd = ['longdate', 'longdateb', 'julian', 'iso'];
            for (let i = 0; i < upd.length; i++) {
                this[upd[i]] = new PopupMenu.PopupMenuItem(upd[i], {activate: false});
                this[upd[i] + 'label'] = this[upd[i]].label;
                this[upd[i]].label.clutter_text.set_use_markup(true);
            }
            this.menu.addMenuItem(this.longdate);
            this.menu.addMenuItem(this.longdateb);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.menu.addMenuItem(this.julian);
            this.menu.addMenuItem(this.iso);

            this._offsetitem = new PopupMenu.PopupBaseMenuItem({activate: false});

            this._morebackButton = new St.Button({
                style_class: 'calendar-change-month-more-back',
                accessible_name: _('Previous month'),
                can_focus: true,
            });
            this._offsetitem.add_child(this._morebackButton);
            this._morebackButton._signalId = this._morebackButton.connect(
                'clicked', this.changeOffsetMinusThirty.bind(this));

            this._backButton = new St.Button({
                style_class: 'calendar-change-month-back',
                accessible_name: _('Previous day'),
                can_focus: true,
            });
            this._offsetitem.add_child(this._backButton);
            this._backButton._signalId = this._backButton.connect(
                'clicked', this.changeOffsetMinusOne.bind(this));

            this._offsetButton = new St.Button({
                style_class: 'calendar-offset',
                y_expand: true,
                x_expand: true,
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.CENTER,
                can_focus: true,
            });
            this.offsetlabel = new St.Label({
                text: 'test',
                y_expand: true,
                x_expand: true,
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.CENTER,
            });
            this._offsetButton.set_child(this.offsetlabel);
            this._offsetButton._signalId = this._offsetButton.connect(
                'clicked', this.changeOffsetToday.bind(this));
            this._offsetitem.add_child(this._offsetButton);

            this._forwardButton = new St.Button({
                style_class: 'calendar-change-month-forward',
                accessible_name: _('Next day'),
                can_focus: true,
            });
            this._offsetitem.add_child(this._forwardButton);
            this._forwardButton._signalId = this._forwardButton.connect(
                'clicked', this.changeOffsetPlusOne.bind(this));

            this._moreforwardButton = new St.Button({
                style_class: 'calendar-change-month-more-forward',
                accessible_name: _('Next month'),
                can_focus: true,
            });
            this._offsetitem.add_child(this._moreforwardButton);
            this._moreforwardButton._signalId = this._moreforwardButton.connect(
                'clicked', this.changeOffsetPlusThirty.bind(this));

            this.menu.addMenuItem(this._offsetitem);

            const naturalSize = this.iso.get_preferred_height(900000)[0] * 12;
            const minSize = Main.panel.width / 6;
            if (minSize > naturalSize) {
                this.menu.actor.set_width(minSize);
            } else {
                this.menu.actor.set_width(naturalSize);
            }

            this._timeoutId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT, 1, () => {
                    this.update();
                    return GLib.SOURCE_CONTINUE;
                });
            this.update();
        }

        changeOffset(value, relative) {
            if (relative) {
                this.offsetval += value;
            } else {
                this.offsetval = value;
            }
            this.update();
        }
        changeOffsetMinusThirty() { this.changeOffset(-30, true); }
        changeOffsetPlusThirty() { this.changeOffset(30, true); }
        changeOffsetMinusOne() { this.changeOffset(-1, true); }
        changeOffsetPlusOne() { this.changeOffset(1, true); }
        changeOffsetToday() { this.changeOffset(0, false); }

        update() {
            this._setDate();
            const upd = ['top', 'longdate', 'longdateb', 'julian', 'iso', 'offset'];
            for (let i = 0; i < upd.length; i++) {
                if (this[upd[i] + 'label']) {
                    this[upd[i] + 'label'].clutter_text.set_markup(this[upd[i] + 'text']);
                }
            }
            return true;
        }

        _setDate() {
            var jrr, jrrr, date, longdate, longdateb;
            const off = this.offsetsign * this.offsetval;
            const time = new Date();
            const j = astro.gregorian_to_jd(time.getFullYear(), time.getMonth() + 1, time.getDate());
            const jj = j + off;
            jrr = astro.jd_to_french_revolutionary(jj);
            if (jj != 0) {
                jrrr = astro.jd_to_french_revolutionary(j);
            } else {
                jrrr = jrr;
            }
            const offgd = astro.jd_to_gregorian(jj);
            const daymonth = this._daymonth(jrr);
            if (jrr[1] != 13) {
                longdate = _dayNames[jrr[3] - 1] + ', ' + daymonth + ' ' + _monthNames[jrr[1] - 1] + ', an ' + _romanNumeral(jrr[0]);
                longdateb = '<i>' + _saintsNames[jrr[1] - 1][(jrr[2] - 1) * 10 + jrr[3] - 1] + '</i>, jour ' + jrr[3] + ' de la ' + _decadeNames[jrr[2] - 1] + ' décade';
            } else {
                longdate = _sansculottidesNames[jrr[3] - 1] + ', an ' + _romanNumeral(jrr[0]);
                longdateb = daymonth + ' jour des ' + _monthNames[jrr[1] - 1];
            }
            date = this._daymonth(jrrr) + ' ' + _monthNames[jrrr[1] - 1] + ', ' + _('year') + ' ' + jrrr[0];
            this.toptext = date;
            this.longdatetext = longdate;
            this.longdatebtext = longdateb;
            this.juliantext = '<b>' + _('Julian day') + '</b> ' + (jj - 0.5);
            this.isotext = '<b>' + _('ISO-8601 date') + '</b> ' + offgd[0] + '-';
            if (offgd[1] < 10) {
                this.isotext = this.isotext + '0';
            }
            this.isotext = this.isotext + offgd[1] + '-';
            if (offgd[2] < 10) {
                this.isotext = this.isotext + '0';
            }
            this.isotext = this.isotext + offgd[2];
            let offstring = '';
            if (off == 0) {
                offstring = '<b>' + _('Today') + '</b>';
            } else if (off == 1) {
                offstring = '<b>' + _('Tomorrow') + '</b>';
            } else if (off == -1) {
                offstring = '<b>' + _('Yesterday') + '</b>';
            } else if (off > 0) {
                offstring = _('In <b>{1}</b> days').replace('{1}', off);
            } else {
                offstring = _('<b>{1}</b> days ago').replace('{1}', -off);
            }
            this.offsettext = offstring;
        }

        _daymonth(jrr) {
            let daymonth = (jrr[2] - 1) * 10 + jrr[3];
            if (jrr[1] != 13) {
                if (daymonth == 1) {
                    daymonth = daymonth + '<sup>er</sup>';
                }
            } else {
                if (daymonth == 1) {
                    daymonth = daymonth + '<sup>er</sup>';
                } else {
                    daymonth = daymonth + '<sup>e</sup>';
                }
            }
            return daymonth;
        }

        destroy() {
            if (this._timeoutId) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = 0;
            }
            const buttons = [
                '_morebackButton', '_backButton', '_offsetButton',
                '_forwardButton', '_moreforwardButton',
            ];
            for (let i = 0; i < buttons.length; i++) {
                const b = this[buttons[i]];
                if (b && b._signalId) {
                    b.disconnect(b._signalId);
                    b._signalId = 0;
                }
            }
            super.destroy();
        }
    }
);

export default class FrenchRepublicanCalendarExtension extends Extension {
    enable() {
        this._indicator = new FrenchRepublicanCalendarTopMenu();
        let pos = 1;
        if ('apps-menu' in Main.panel.statusArea)
            pos = 2;
        Main.panel.addToStatusArea('frenchrepublicancalendar-menu', this._indicator, pos, 'center');
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
