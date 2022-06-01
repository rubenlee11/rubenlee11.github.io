clear;clc;close all
e1 = pi/9;
e2 = 2*pi/9;
lambda = 400:0.1:700;
n = 1200;
gamma = 180*(acos(n*lambda*1e-6/(2*cos((e1+e2)/2)))+(e2-e1)/2)/pi;
