describe('Calculator Logic', () => {
  const calculateBase = (area: number, thickness: number, density: number) => {
    return (area * thickness * density) / 100;
  };

  const applyAddon = (base: number, addonPercent: number) => {
    return base * (1 + addonPercent / 100);
  };

  test('powinien poprawnie liczyć wynik bazowy', () => {
    // 100m2 * 4cm * 2.4 t/m3 / 100 = 9.6t
    expect(calculateBase(100, 4, 2.4)).toBeCloseTo(9.6);
    
    // 50m2 * 5cm * 2.35 t/m3 / 100 = 5.875t
    expect(calculateBase(50, 5, 2.35)).toBeCloseTo(5.875);
  });

  test('powinien poprawnie nakładać naddatek', () => {
    const base = 10.0;
    expect(applyAddon(base, 5)).toBeCloseTo(10.5);
    expect(applyAddon(base, 10)).toBeCloseTo(11.0);
    expect(applyAddon(base, 0)).toBeCloseTo(10.0);
  });

  test('powinien obsługiwać brzegowe wartości', () => {
    expect(calculateBase(0, 4, 2.4)).toBe(0);
    expect(calculateBase(100, 0, 2.4)).toBe(0);
    expect(calculateBase(100, 4, 0)).toBe(0);
  });
});
